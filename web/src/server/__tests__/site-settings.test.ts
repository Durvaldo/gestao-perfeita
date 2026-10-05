// @vitest-environment node
// "Meu site" (SPEC-0007 RF-2, TASK-0038): the admin customizes the public site.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { unscopedDb } from "@/lib/db";
import { fileRoutes } from "@/server/files/files";
import { loadPublicSite } from "@/server/site/site";
import { siteSettingsRoutes } from "@/server/site/site-settings";
import { seed } from "../../../prisma/seed-data";
import { call, loginCookie } from "../../../tests/api";
import { truncateAll } from "../../../tests/db";

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("png")]);

let dir: string;
let admin: string;
let carlos: string;
let otherAdmin: string;

async function upload(cookie = admin): Promise<string> {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(PNG)], "x.png", { type: "image/png" }));
  const response = await fileRoutes.collection.POST(new Request("http://localhost/api/files", { method: "POST", headers: { cookie }, body: form }), {
    params: Promise.resolve({}),
  });
  return ((await response.json()) as { url: string }).url;
}

const save = (body: Record<string, unknown>, cookie = admin) => call(siteSettingsRoutes.PUT, { method: "PUT", cookie, body: { enabled: true, ...body } });

describe("site settings API", () => {
  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "agenda-site-"));
    process.env.LOCAL_FILE_STORAGE_DIR = dir;
    await truncateAll();
    await seed(unscopedDb);
    admin = await loginCookie("admin@barbearia-centro.com");
    carlos = await loginCookie("carlos@barbearia-centro.com");
    otherAdmin = await loginCookie("admin@barbearia-zona-sul.com");
  });
  beforeEach(async () => {
    await unscopedDb.tenantSetting.deleteMany();
    await unscopedDb.storedFile.deleteMany();
    await unscopedDb.tenant.updateMany({ data: { logoUrl: null } });
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
    await unscopedDb.$disconnect();
  });

  test("starts with the defaults; only the admin manages it", async () => {
    const res = await call(siteSettingsRoutes.GET, { cookie: admin });
    expect(res.body).toMatchObject({ enabled: true, slug: "barbearia-centro", about: null, logoUrl: null, gallery: [] });
    expect((await call(siteSettingsRoutes.GET, { cookie: carlos })).status).toBe(403);
    expect((await save({ about: "x" }, carlos)).status).toBe(403);
  });

  test("texts, contacts and images show up on the public site", async () => {
    const logo = await upload();
    const cover = await upload();
    const res = await save({
      about: "Desde 1990.",
      whatsapp: "(11) 97777-6666",
      instagram: "https://instagram.com/barbearia",
      logoUrl: logo,
      coverUrl: cover,
      gallery: [await upload(), await upload()],
    });
    expect(res.status).toBe(200);
    expect(res.body.whatsapp).toBe("11977776666");

    const site = await loadPublicSite("barbearia-centro");
    expect(site).toMatchObject({ about: "Desde 1990.", whatsapp: "11977776666", logoUrl: logo, coverUrl: cover, instagram: "https://instagram.com/barbearia" });
    expect(site!.gallery).toHaveLength(2);
  });

  test("replacing or removing an image deletes the old file", async () => {
    const oldLogo = await upload();
    const galleryImage = await upload();
    await save({ logoUrl: oldLogo, gallery: [galleryImage] });

    const newLogo = await upload();
    await save({ logoUrl: newLogo, gallery: [] });

    const remaining = (await unscopedDb.storedFile.findMany()).map((f) => `/api/files/${f.id}`);
    expect(remaining).toEqual([newLogo]);
  });

  test("turning the site off takes it down", async () => {
    await save({ enabled: false });
    expect(await loadPublicSite("barbearia-centro")).toBeNull();
  });

  test("refuses images that weren't uploaded by this barbershop, invalid links and too many photos", async () => {
    expect((await save({ logoUrl: "https://example.com/logo.png" })).status).toBe(422);
    const othersFile = await upload(otherAdmin);
    expect((await save({ coverUrl: othersFile })).status).toBe(422);

    const badLink = await save({ instagram: "javascript:alert(1)" });
    expect(badLink.body.errors.instagram).toBeDefined();
    const tooMany = await save({ gallery: Array.from({ length: 9 }, () => "/api/files/x") });
    expect(tooMany.body.errors.gallery).toBeDefined();
  });

  test("an existing external logo is kept when saving other changes", async () => {
    const tenant = await unscopedDb.tenant.findUniqueOrThrow({ where: { slug: "barbearia-centro" } });
    await unscopedDb.tenant.update({ where: { id: tenant.id }, data: { logoUrl: "https://cdn.example.com/logo.png" } });

    const res = await save({ about: "Novo texto." });
    expect(res.status).toBe(200);
    expect(res.body.logoUrl).toBe("https://cdn.example.com/logo.png");
  });
});
