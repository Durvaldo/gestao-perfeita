// @vitest-environment node
// Storage backends (ADR-0015): Google Drive over REST (with a fake fetch) and local disk.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { googleDriveStorage, localStorage, StorageNotConfiguredError, storageBackend } from "../storage";

const config = { clientId: "cid", clientSecret: "secret", refreshToken: "refresh", folderId: "folder-123" };

/** Fake fetch that records the calls and answers like Google. */
function fakeGoogle() {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    if (url.startsWith("https://oauth2.googleapis.com/token")) return Response.json({ access_token: "tok", expires_in: 3600 });
    if (url.startsWith("https://www.googleapis.com/upload/")) return Response.json({ id: "drive-file-1" });
    if (url.endsWith("?alt=media")) return new Response(new Uint8Array([1, 2, 3]));
    return new Response(null, { status: 204 });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

describe("Google Drive storage", () => {
  test("uploads to the configured folder with a refreshed token, reads and deletes", async () => {
    const google = fakeGoogle();
    const drive = googleDriveStorage(config, google.fetchImpl);

    const key = await drive.put(Buffer.from("IMAGE-BYTES"), "image/png", "tenant-1.png");
    expect(key).toBe("drive-file-1");
    const token = google.calls[0];
    expect(String(token.init.body)).toContain("grant_type=refresh_token");
    const upload = google.calls[1];
    expect(upload.init.headers).toMatchObject({ authorization: "Bearer tok" });
    const body = (upload.init.body as Buffer).toString();
    expect(body).toContain('"parents":["folder-123"]');
    expect(body).toContain("IMAGE-BYTES");

    expect([...(await drive.get("drive-file-1"))]).toEqual([1, 2, 3]);
    await drive.remove("drive-file-1");
    expect(google.calls.at(-1)).toMatchObject({ url: "https://www.googleapis.com/drive/v3/files/drive-file-1", init: { method: "DELETE" } });
    // The access token is reused while valid: one token request in total.
    expect(google.calls.filter((c) => c.url.includes("oauth2")).length).toBe(1);
  });

  test("a failed Google request is an error, not a silent success", async () => {
    const failing = (async (url: string) =>
      url.includes("oauth2") ? Response.json({ access_token: "tok", expires_in: 3600 }) : new Response("quota", { status: 403 })) as unknown as typeof fetch;
    await expect(googleDriveStorage(config, failing).put(Buffer.from("x"), "image/png", "a.png")).rejects.toThrow(/403/);
  });
});

describe("local storage and backend selection", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "agenda-storage-"));
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  test("round trip on disk, and keys can't escape the folder", async () => {
    const local = localStorage(dir);
    const key = await local.put(Buffer.from("abc"), "image/png", "x.png");
    expect(key).toMatch(/\.png$/);
    expect((await local.get(key)).toString()).toBe("abc");
    await local.remove(key);
    await expect(local.get(key)).rejects.toThrow();
    await expect(local.get("../.env")).rejects.toThrow(/Invalid storage key/);
  });

  test("Drive when configured; local disk in development; error in production without Drive", () => {
    const drive = { GOOGLE_DRIVE_CLIENT_ID: "a", GOOGLE_DRIVE_CLIENT_SECRET: "b", GOOGLE_DRIVE_REFRESH_TOKEN: "c", GOOGLE_DRIVE_FOLDER_ID: "d" };
    expect(storageBackend({ ...drive, NODE_ENV: "production" } as NodeJS.ProcessEnv).name).toBe("google-drive");
    expect(storageBackend({ NODE_ENV: "development", LOCAL_FILE_STORAGE_DIR: dir } as NodeJS.ProcessEnv).name).toBe("local");
    expect(() => storageBackend({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toThrow(StorageNotConfiguredError);
  });
});
