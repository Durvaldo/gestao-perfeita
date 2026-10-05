import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/current-user";
import { AgendaScreen } from "./agenda-screen";

export const metadata: Metadata = { title: "Agenda · Agenda da Barbearia" };

export default async function Page() {
  // The layout already guarantees a signed-in user with a tenant.
  const user = (await getCurrentUser())!;
  return (
    <AgendaScreen
      timeZone={user.tenant?.timezone ?? "America/Sao_Paulo"}
      isAdmin={user.role === "admin"}
      ownProfessionalId={user.role === "professional" ? (user.professional?.id ?? null) : null}
      barbershop={user.tenant?.name ?? ""}
    />
  );
}
