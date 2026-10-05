import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Where uploaded file bytes live (ADR-0015). Google Drive in any real deploy (the
// owner's choice, SPEC-0007 Q2); local disk only when Drive is not configured,
// for development and tests. The app never hands out the backend's own links:
// files are served by /api/files/{id}.

export type StorageBackend = {
  name: "google-drive" | "local";
  put(bytes: Buffer, mimeType: string, fileName: string): Promise<string>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
};

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("File storage is not configured (GOOGLE_DRIVE_* variables)");
  }
}

// ---------------------------------------------------------------------------
// Google Drive (REST v3 over fetch). Uses an OAuth refresh token of the
// platform's Google account: service accounts have no storage quota of their own
// outside a Shared Drive.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id";
const FILES_URL = "https://www.googleapis.com/drive/v3/files";

/** folderId is optional: with the drive.file scope the app only sees what it created, so the folder must be created by the app (scripts/drive-create-folder.ts); without it, files go to the Drive root. */
type DriveConfig = { clientId: string; clientSecret: string; refreshToken: string; folderId?: string };

export function driveConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DriveConfig | null {
  const { GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, GOOGLE_DRIVE_FOLDER_ID } = env;
  if (!GOOGLE_DRIVE_CLIENT_ID || !GOOGLE_DRIVE_CLIENT_SECRET || !GOOGLE_DRIVE_REFRESH_TOKEN) return null;
  return {
    clientId: GOOGLE_DRIVE_CLIENT_ID,
    clientSecret: GOOGLE_DRIVE_CLIENT_SECRET,
    refreshToken: GOOGLE_DRIVE_REFRESH_TOKEN,
    folderId: GOOGLE_DRIVE_FOLDER_ID || undefined,
  };
}

/** Exchanges the refresh token for an access token, cached until a minute before it expires. */
export function driveAccessToken(config: DriveConfig, fetchImpl: typeof fetch = fetch) {
  let token: { value: string; expiresAt: number } | null = null;
  return async function accessToken(): Promise<string> {
    if (token && token.expiresAt > Date.now() + 60_000) return token.value;
    const response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!response.ok) throw new Error(`Google OAuth token refresh failed: ${response.status}`);
    const body = (await response.json()) as { access_token: string; expires_in: number };
    token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
    return token.value;
  };
}

export function googleDriveStorage(config: DriveConfig, fetchImpl: typeof fetch = fetch): StorageBackend {
  const accessToken = driveAccessToken(config, fetchImpl);

  async function call(url: string, init: RequestInit): Promise<Response> {
    const response = await fetchImpl(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${await accessToken()}` } });
    if (!response.ok && response.status !== 404) throw new Error(`Google Drive request failed: ${response.status}`);
    return response;
  }

  return {
    name: "google-drive",
    async put(bytes, mimeType, fileName) {
      const boundary = `agenda-${randomUUID()}`;
      const metadata = JSON.stringify({ name: fileName, ...(config.folderId ? { parents: [config.folderId] } : {}) });
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
        Buffer.from(`--${boundary}\r\ncontent-type: ${mimeType}\r\n\r\n`),
        bytes,
        Buffer.from(`\r\n--${boundary}--`),
      ]);
      const response = await call(UPLOAD_URL, {
        method: "POST",
        headers: { "content-type": `multipart/related; boundary=${boundary}` },
        body,
      });
      return ((await response.json()) as { id: string }).id;
    },
    async get(key) {
      const response = await call(`${FILES_URL}/${encodeURIComponent(key)}?alt=media`, { method: "GET" });
      if (response.status === 404) throw new Error("File not found in Google Drive");
      return Buffer.from(await response.arrayBuffer());
    },
    async remove(key) {
      // Already gone (404) is fine: removing is idempotent.
      await call(`${FILES_URL}/${encodeURIComponent(key)}`, { method: "DELETE" });
    },
  };
}

// ---------------------------------------------------------------------------
// Local disk: development and tests only (a serverless deploy has no durable disk).

export function localStorage(dir: string): StorageBackend {
  const resolve = (key: string) => {
    // Keys are generated here; refuse anything that could escape the folder.
    if (!/^[\w.-]+$/.test(key)) throw new Error("Invalid storage key");
    return path.join(dir, key);
  };
  return {
    name: "local",
    async put(bytes, _mimeType, fileName) {
      await mkdir(dir, { recursive: true });
      const key = `${randomUUID()}${path.extname(fileName)}`;
      await writeFile(resolve(key), bytes);
      return key;
    },
    async get(key) {
      return readFile(resolve(key));
    },
    async remove(key) {
      await rm(resolve(key), { force: true });
    },
  };
}

/**
 * The configured backend: Google Drive when its variables are set; local disk
 * otherwise, except in production, where a missing configuration is an error
 * (files written to a serverless disk would be lost).
 */
export function storageBackend(env: NodeJS.ProcessEnv = process.env): StorageBackend {
  const drive = driveConfigFromEnv(env);
  if (drive) return googleDriveStorage(drive);
  if (env.NODE_ENV === "production" && env.ALLOW_LOCAL_FILE_STORAGE !== "true") throw new StorageNotConfiguredError();
  return localStorage(env.LOCAL_FILE_STORAGE_DIR ?? path.join(process.cwd(), ".storage"));
}
