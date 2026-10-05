// @vitest-environment node
// Uploaded images (SPEC-0007, ADR-0015, TASK-0036) with the local disk backend.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { unscopedDb } from "@/lib/db";
import { fileIdFromUrl, fileRoutes, MAX_FILE_BYTES } from "@/server/files/files";
import { seed } from "../../../prisma/seed-data";
import { loginCookie } from "../../../tests/api";
import { truncateAll } from "../../../tests/db";

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("rest-of-png")]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("jpeg")]);

let dir: string;
let admin: string;
let carlos: string;
let otherAdmin: string;

async function upload(bytes: Buffer, cookie: string, name = "foto.png", type = "image/png") {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(bytes)], name, { type }));
  const response = await fileRoutes.collection.POST(new Request("http://localhost/api/files", { method: "POST", headers: { cookie }, body: form }), {
    params: Promise.resolve({}),
  });
  return { status: response.status, body: await response.json() };
}

const fetchFile = (id: string) => fileRoutes.item.GET(new Request(`http://localhost/api/files/${id}`), { params: Promise.resolve({ id }) });
const deleteFile = async (id: string, cookie: string) =>
  (await fileRoutes.item.DELETE(new Request(`http://localhost/api/files/${id}`, { method: "DELETE", headers: { cookie } }), { params: Promise.resolve({ id }) })).status;

describe("files API", () => {
  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "agenda-files-"));
    process.env.LOCAL_FILE_STORAGE_DIR = dir;
    await truncateAll();
    await seed(unscopedDb);
    admin = await loginCookie("admin@barbearia-centro.com");
    carlos = await loginCookie("carlos@barbearia-centro.com");
    otherAdmin = await loginCookie("admin@barbearia-zona-sul.com");
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
    await unscopedDb.$disconnect();
  });

  test("the admin uploads an image; anyone can fetch it, cached for a year", async () => {
    const res = await upload(PNG, admin);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ mimeType: "image/png", size: PNG.length });
    const id = fileIdFromUrl(res.body.url)!;
    expect(id).toBe(res.body.id);

    const served = await fetchFile(id); // no session
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(served.headers.get("cache-control")).toContain("immutable");
    expect(Buffer.from(await served.arrayBuffer()).equals(PNG)).toBe(true);
  });

  test("the type comes from the bytes, not from the browser", async () => {
    // A JPEG sent as "image/png" is stored as JPEG; a text file named .png is refused.
    expect((await upload(JPEG, admin, "x.png", "image/png")).body.mimeType).toBe("image/jpeg");
    const fake = await upload(Buffer.from("<script>alert(1)</script>"), admin, "x.png", "image/png");
    expect(fake.status).toBe(422);
    expect(fake.body.errors).toEqual({ file: ["Envie uma imagem JPEG, PNG ou WebP."] });
  });

  test("size limit, missing file and permission", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(MAX_FILE_BYTES)]);
    expect((await upload(big, admin)).body.errors).toEqual({ file: ["A imagem deve ter no máximo 4 MB."] });

    const empty = await fileRoutes.collection.POST(
      new Request("http://localhost/api/files", { method: "POST", headers: { cookie: admin }, body: new FormData() }),
      { params: Promise.resolve({}) },
    );
    expect(empty.status).toBe(422);
    expect((await upload(PNG, carlos)).status).toBe(403);
  });

  test("deleting removes the file; another barbershop can't delete it", async () => {
    const { body } = await upload(PNG, admin);

    expect(await deleteFile(body.id, otherAdmin)).toBe(404);
    expect(await deleteFile(body.id, carlos)).toBe(403);
    expect(await deleteFile(body.id, admin)).toBe(204);
    expect((await fetchFile(body.id)).status).toBe(404);
    expect((await fetchFile("not-a-uuid")).status).toBe(404);
  });
});
