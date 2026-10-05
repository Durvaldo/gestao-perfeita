import { randomBytes } from "node:crypto";
import { authorize } from "@/lib/authz/guard";
import { db, unscopedDb } from "@/lib/db";
import { NotFoundError } from "@/lib/http-errors";
import { runWithTenant } from "@/lib/tenancy/context";
import { parseId } from "@/server/http/crud";
import { apiRoute } from "@/server/http/route";
import { buildIcs } from "./ics";

// Calendar feed per professional (SPEC-0006 RF-2b, TASK-0042): a secret URL that
// Google Calendar, Apple Calendar or Outlook subscribe to. The token is stored as
// is, so the link can be shown again: it only grants read access to data that
// the database already holds, and generating a new one revokes the old.

/** How far back the feed goes; everything ahead is included. */
const PAST_DAYS = 30;

const feedPath = (token: string) => `/api/calendar/${token}.ics`;

async function findProfessionalOr404(id: number) {
  const professional = await db.professional.findUnique({ where: { id }, select: { id: true, calendarToken: true } });
  if (!professional) throw new NotFoundError();
  return professional;
}

// GET /api/professionals/[id]/calendar-feed → { path } (null = no feed)
const show = apiRoute<{ id: string }>(async ({ params, user }) => {
  const professional = await findProfessionalOr404(parseId(params.id));
  authorize(user, "calendarFeed", "manage", { professionalId: professional.id });
  return { path: professional.calendarToken ? feedPath(professional.calendarToken) : null };
});

// POST /api/professionals/[id]/calendar-feed — new link; the previous one stops working.
const regenerate = apiRoute<{ id: string }>(async ({ params, user }) => {
  const professional = await findProfessionalOr404(parseId(params.id));
  authorize(user, "calendarFeed", "manage", { professionalId: professional.id });
  const token = randomBytes(24).toString("base64url");
  await db.professional.update({ where: { id: professional.id }, data: { calendarToken: token } });
  return { path: feedPath(token) };
});

// DELETE /api/professionals/[id]/calendar-feed — turns the feed off.
const revoke = apiRoute<{ id: string }>(async ({ params, user }) => {
  const professional = await findProfessionalOr404(parseId(params.id));
  authorize(user, "calendarFeed", "manage", { professionalId: professional.id });
  await db.professional.update({ where: { id: professional.id }, data: { calendarToken: null } });
  return { path: null };
});

/**
 * GET /api/calendar/[token] (the URL ends in ".ics") — public: the secret token is
 * the key. Finds the professional across tenants on purpose (unscopedDb), then
 * reads the appointments inside that tenant's context.
 */
async function feed(_request: Request, context: { params: Promise<{ token: string }> }): Promise<Response> {
  const { token: raw } = await context.params;
  const token = raw.replace(/\.ics$/, "");
  const professional = /^[\w-]{20,}$/.test(token)
    ? await unscopedDb.professional.findUnique({
        where: { calendarToken: token },
        select: { id: true, tenantId: true, user: { select: { name: true } }, tenant: { select: { name: true } } },
      })
    : null;
  if (!professional) return new Response("Not found", { status: 404 });

  const since = new Date(Date.now() - PAST_DAYS * 86_400_000);
  const appointments = await runWithTenant(professional.tenantId, () =>
    db.appointment.findMany({
      where: { professionalId: professional.id, status: { not: "cancelled" }, endsAt: { gt: since } },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        customer: { select: { name: true } },
        services: { select: { service: { select: { name: true } } } },
      },
      orderBy: { startsAt: "asc" },
    }),
  );

  const ics = buildIcs({
    name: `${professional.tenant.name} · ${professional.user.name.split(" ")[0]}`,
    events: appointments.map((a) => ({
      uid: `appointment-${a.id}@agenda-barbearia`,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      summary: `${a.customer.name} · ${a.services.map((s) => s.service.name).join(", ")}`,
      location: professional.tenant.name,
      tentative: a.status === "pending",
    })),
  });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="agenda.ics"',
      "cache-control": "private, max-age=300",
    },
  });
}

export const calendarFeedRoutes = { manage: { GET: show, POST: regenerate, DELETE: revoke }, feed: { GET: feed } };
