import { authorize } from "@/lib/authz/guard";
import { db, unscopedDb } from "@/lib/db";
import { errorResponse, NotFoundError, ValidationError } from "@/lib/http-errors";
import { requireTenantId } from "@/lib/tenancy/context";
import { apiRoute, created, noContent } from "@/server/http/route";
import { localStorage, storageBackend, type StorageBackend, StorageNotConfiguredError } from "./storage";
import path from "node:path";

// Uploaded images (SPEC-0007, ADR-0015): POST /api/files (admin), DELETE
// /api/files/[id] (admin) and the public GET /api/files/[id] that serves them.

// 4 MB: below the 4.5 MB request body limit of serverless platforms such as Vercel.
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The image type from the file's first bytes (the browser's declared type is not trusted). */
export function detectImageType(bytes: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

const EXTENSION = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" } as const;

/** Public URL of a stored file. */
export const fileUrl = (id: string) => `/api/files/${id}`;

/** The id inside one of our file URLs, or null for any other URL (e.g. an external logo). */
export function fileIdFromUrl(url: string | null | undefined): string | null {
  const match = url ? /^\/api\/files\/([0-9a-f-]{36})$/i.exec(url) : null;
  return match && UUID.test(match[1]) ? match[1] : null;
}

/** The backend that holds a stored file: the configured one, or local disk for local records. */
function backendFor(name: string): StorageBackend {
  if (name === "local") return localStorage(process.env.LOCAL_FILE_STORAGE_DIR ?? path.join(process.cwd(), ".storage"));
  return storageBackend();
}

const storageUnavailable = () =>
  ValidationError.field("file", "O armazenamento de arquivos não está configurado. Fale com o suporte.");

/**
 * Deletes one of the tenant's files (bytes and record). Unknown ids are ignored,
 * so replacing an image is safe to retry. Run inside the tenant's context.
 */
export async function deleteStoredFile(id: string): Promise<void> {
  const file = await db.storedFile.findUnique({ where: { id } });
  if (!file) return;
  await backendFor(file.backend).remove(file.storageKey);
  await db.storedFile.delete({ where: { id } });
}

// POST /api/files — multipart/form-data with a "file" field.
const upload = apiRoute(async ({ request, user }) => {
  authorize(user, "file", "create");
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw ValidationError.field("file", "O campo arquivo é obrigatório.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw ValidationError.field("file", "A imagem deve ter no máximo 4 MB.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = detectImageType(bytes);
  if (!mimeType) {
    throw ValidationError.field("file", "Envie uma imagem JPEG, PNG ou WebP.");
  }

  let backend: StorageBackend;
  try {
    backend = storageBackend();
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) throw storageUnavailable();
    throw error;
  }
  const tenantId = requireTenantId();
  const storageKey = await backend.put(bytes, mimeType, `tenant-${tenantId}${EXTENSION[mimeType]}`);
  const stored = await db.storedFile.create({
    data: { tenantId, storageKey, backend: backend.name, mimeType, size: bytes.length },
  });
  return created({ id: stored.id, url: fileUrl(stored.id), mimeType, size: stored.size });
});

// DELETE /api/files/[id] — the tenant's own files only (another tenant's → 404).
const destroy = apiRoute<{ id: string }>(async ({ params, user }) => {
  authorize(user, "file", "delete");
  if (!UUID.test(params.id)) throw new NotFoundError();
  const file = await db.storedFile.findUnique({ where: { id: params.id } });
  if (!file) throw new NotFoundError();
  await deleteStoredFile(file.id);
  return noContent();
});

/**
 * GET /api/files/[id] — public, no session: the site's images are public by
 * nature, and the random UUID is the access key. Reads across tenants on
 * purpose (unscopedDb, ADR-0015). Cached for a year: a file never changes under
 * the same id (replacing an image creates a new id).
 */
async function serve(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await context.params;
    if (!UUID.test(id)) throw new NotFoundError();
    const file = await unscopedDb.storedFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundError();
    const bytes = await backendFor(file.backend).get(file.storageKey);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": file.mimeType,
        "content-length": String(bytes.length),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const fileRoutes = {
  collection: { POST: upload },
  item: { GET: serve, DELETE: destroy },
};
