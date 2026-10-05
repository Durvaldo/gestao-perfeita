import { db } from "@/lib/db";
import { phoneDigits } from "@/lib/phone";
import { runWithTenant } from "@/lib/tenancy/context";

// Public barbershop site (SPEC-0007, ADR-0014): one ready-made template filled
// with the data the barbershop already registered, plus the texts and images the
// admin customizes (stored in tenant_settings under "site", ADR-0013).

export const SITE_SETTING_KEY = "site";

export type SiteSettings = {
  /** Site on the air. On by default: every barbershop gets a site (SPEC-0007). */
  enabled: boolean;
  about: string | null;
  /** Digits only, without the country code (SPEC-0005); falls back to the barbershop phone. */
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  coverUrl: string | null;
  gallery: string[];
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  enabled: true,
  about: null,
  whatsapp: null,
  instagram: null,
  facebook: null,
  coverUrl: null,
  gallery: [],
};

/** The barbershop's site settings, with defaults. Run inside the tenant's context. */
export async function loadSiteSettings(): Promise<SiteSettings> {
  const setting = await db.tenantSetting.findFirst({ where: { key: SITE_SETTING_KEY } });
  return { ...DEFAULT_SITE_SETTINGS, ...((setting?.value ?? {}) as Partial<SiteSettings>) };
}

/** Opening hours per weekday: from the earliest to the latest working period of any active professional. */
export function openingHours(periods: { weekday: number; startTime: Date; endTime: Date }[]) {
  const byDay = new Map<number, { open: string; close: string }>();
  const hhmm = (value: Date) => value.toISOString().slice(11, 16);
  for (const p of periods) {
    const current = byDay.get(p.weekday);
    const open = hhmm(p.startTime);
    const close = hhmm(p.endTime);
    byDay.set(p.weekday, {
      open: current && current.open < open ? current.open : open,
      close: current && current.close > close ? current.close : close,
    });
  }
  return [...byDay.entries()].sort(([a], [b]) => a - b).map(([weekday, h]) => ({ weekday, ...h }));
}

/**
 * Everything the public page shows, or null when there is no site: unknown slug,
 * suspended barbershop or site turned off. Only public fields are selected, one
 * by one (no commission, customer data or user e-mails).
 */
export async function loadPublicSite(slug: string) {
  const tenant = await db.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, phone: true, address: true, logoUrl: true, status: true },
  });
  if (!tenant || tenant.status === "suspended") return null;

  return runWithTenant(tenant.id, async () => {
    const settings = await loadSiteSettings();
    if (!settings.enabled) return null;

    const [services, professionals, periods] = await Promise.all([
      db.service.findMany({
        where: { active: true },
        select: { id: true, name: true, description: true, durationMinutes: true, price: true },
        orderBy: { name: "asc" },
      }),
      db.professional.findMany({
        where: { active: true },
        select: { id: true, photoUrl: true, user: { select: { name: true } } },
        orderBy: { id: "asc" },
      }),
      db.workingHour.findMany({ where: { professional: { active: true } }, select: { weekday: true, startTime: true, endTime: true } }),
    ]);

    const whatsapp = settings.whatsapp ?? (tenant.phone ? phoneDigits(tenant.phone) : null);
    return {
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      address: tenant.address,
      phone: tenant.phone,
      whatsapp: whatsapp || null,
      about: settings.about,
      instagram: settings.instagram,
      facebook: settings.facebook,
      coverUrl: settings.coverUrl,
      gallery: settings.gallery,
      services: services.map((s) => ({ ...s, price: s.price.toFixed(2) })),
      team: professionals.map((p) => ({ id: p.id, name: p.user.name, photoUrl: p.photoUrl })),
      hours: openingHours(periods),
    };
  });
}

export type PublicSite = NonNullable<Awaited<ReturnType<typeof loadPublicSite>>>;
