import type { Metadata } from "next";
import { can } from "@/lib/authz/policies";
import { getCurrentUser } from "@/lib/current-user";
import { CustomersScreen } from "./customers-screen";

export const metadata: Metadata = { title: "Clientes · Agenda da Barbearia" };

export default async function CustomersPage() {
  // The layout already guarantees a signed-in user with a tenant.
  const user = (await getCurrentUser())!;
  return <CustomersScreen canManage={can(user, "customer", "create")} />;
}
