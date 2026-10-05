import { z } from "zod";
import { authorize } from "@/lib/authz/guard";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/http-errors";
import { requireTenantId } from "@/lib/tenancy/context";
import { deleteStoredFile, fileIdFromUrl } from "@/server/files/files";
import { boolean, optionalPhone, optionalText } from "@/server/http/fields";
import { apiRoute } from "@/server/http/route";
import { parseBody } from "@/server/http/validation";
import { loadSiteSettings, SITE_SETTING_KEY, type SiteSettings } from "./site";

// "Meu site" (SPEC-0007 RF-2, TASK-0038): the admin customizes the public site.
// Texts and images in tenant_settings ("site", ADR-0014); the logo in
// tenants.logo_url. Images must be files uploaded by this barbershop
// (/api/files/{id}, ADR-0015); replaced or removed ones are deleted.

export const MAX_GALLERY = 8;

const imageUrl = () => z.string().max(100).nullable().optional();
const socialUrl = () => z.url({ protocol: /^https?$/ }).max(255).nullable().optional();

export const siteSettingsSchema = z.object({
  enabled: boolean(),
  logoUrl: imageUrl(),
  coverUrl: imageUrl(),
  gallery: z.array(z.string().max(100)).max(MAX_GALLERY).optional(),
  about: optionalText(2000),
  whatsapp: optionalPhone(),
  instagram: socialUrl(),
  facebook: socialUrl(),
});

export const siteSettingsLabels = {
  enabled: "site no ar",
  logoUrl: "logo",
  coverUrl: "capa",
  gallery: "galeria",
  about: "sobre",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
};

type SiteForm = SiteSettings & { logoUrl: string | null; slug: string };

async function currentForm(): Promise<SiteForm> {
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: requireTenantId() }, select: { logoUrl: true, slug: true } });
  return { ...(await loadSiteSettings()), logoUrl: tenant.logoUrl, slug: tenant.slug };
}

/** Our file ids referenced by the site (logo, cover, gallery). */
const referencedFiles = (form: Pick<SiteForm, "logoUrl" | "coverUrl" | "gallery">) =>
  [form.logoUrl, form.coverUrl, ...form.gallery].map(fileIdFromUrl).filter((id): id is string => id !== null);

// GET /api/site-settings
const show = apiRoute(async ({ user }) => {
  authorize(user, "siteSettings", "update");
  return currentForm();
});

// PUT /api/site-settings
const update = apiRoute(async ({ request, user }) => {
  authorize(user, "siteSettings", "update");
  const input = await parseBody(request, siteSettingsSchema, siteSettingsLabels);
  const current = await currentForm();

  const next = {
    logoUrl: input.logoUrl === undefined ? current.logoUrl : input.logoUrl,
    coverUrl: input.coverUrl === undefined ? current.coverUrl : input.coverUrl,
    gallery: input.gallery ?? current.gallery,
  };

  // Every new image must be a file this barbershop uploaded (the tenant scope hides
  // other tenants' files). Images already on the site (e.g. an older external logo) are kept as they are.
  const before = new Set([current.logoUrl, current.coverUrl, ...current.gallery]);
  const added = [next.logoUrl, next.coverUrl, ...next.gallery].filter((u): u is string => Boolean(u) && !before.has(u));
  const addedIds = added.map(fileIdFromUrl);
  const validIds = addedIds.filter((id): id is string => id !== null);
  const owned = validIds.length > 0 ? await db.storedFile.count({ where: { id: { in: validIds } } }) : 0;
  if (validIds.length !== added.length || owned !== new Set(validIds).size) {
    throw ValidationError.field("logoUrl", "Envie as imagens pelo próprio formulário.");
  }
  const ids = referencedFiles(next);

  const settings: SiteSettings = {
    enabled: input.enabled,
    about: input.about === undefined ? current.about : input.about,
    whatsapp: input.whatsapp === undefined ? current.whatsapp : input.whatsapp,
    instagram: input.instagram === undefined ? current.instagram : input.instagram,
    facebook: input.facebook === undefined ? current.facebook : input.facebook,
    coverUrl: next.coverUrl,
    gallery: next.gallery,
  };
  const tenantId = requireTenantId();
  await db.$transaction([
    db.tenantSetting.upsert({
      where: { tenantId_key: { tenantId, key: SITE_SETTING_KEY } },
      create: { tenantId, key: SITE_SETTING_KEY, value: settings },
      update: { value: settings },
    }),
    db.tenant.update({ where: { id: tenantId }, data: { logoUrl: next.logoUrl } }),
  ]);

  // Images replaced or removed are deleted, after the save succeeded.
  const kept = new Set(ids);
  for (const id of referencedFiles(current)) {
    if (!kept.has(id)) await deleteStoredFile(id);
  }
  return currentForm();
});

export const siteSettingsRoutes = { GET: show, PUT: update };
