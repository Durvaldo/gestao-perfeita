import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/current-user";
import { zonedParts } from "@/lib/timezone";
import { ExceptionsScreen } from "./exceptions-screen";

export const metadata: Metadata = { title: "Exceções da agenda · Agenda da Barbearia" };

export default async function Page() {
  // The layout already guarantees a signed-in user with a tenant.
  const user = (await getCurrentUser())!;
  const timeZone = user.tenant?.timezone ?? "America/Sao_Paulo";
  return (
    <ExceptionsScreen
      isAdmin={user.role === "admin"}
      ownProfessionalId={user.role === "professional" ? (user.professional?.id ?? null) : null}
      timeZone={timeZone}
      today={zonedParts(new Date(), timeZone).date}
      barbershop={user.tenant?.name ?? ""}
    />
  );
}
