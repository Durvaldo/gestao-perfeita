import type { Metadata } from "next";
import { can } from "@/lib/authz/policies";
import { getCurrentUser } from "@/lib/current-user";
import { ProfessionalsScreen } from "./professionals-screen";

export const metadata: Metadata = { title: "Barbeiros · Agenda da Barbearia" };

export default async function Page() {
  // The layout already guarantees a signed-in user with a tenant.
  const user = (await getCurrentUser())!;
  return (
    <ProfessionalsScreen
      canManage={can(user, "professional", "create")}
      // A professional may manage their own working hours (ADR-0006).
      ownProfessionalId={user.professional?.id ?? null}
    />
  );
}
