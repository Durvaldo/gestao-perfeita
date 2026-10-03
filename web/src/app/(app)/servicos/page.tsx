import type { Metadata } from "next";
import { can } from "@/lib/authz/policies";
import { getCurrentUser } from "@/lib/current-user";
import { ServicesScreen } from "./services-screen";

export const metadata: Metadata = { title: "Serviços · Agenda da Barbearia" };

export default async function Page() {
  // The layout already guarantees a signed-in user with a tenant.
  const user = (await getCurrentUser())!;
  return <ServicesScreen canManage={can(user, "service", "create")} />;
}
