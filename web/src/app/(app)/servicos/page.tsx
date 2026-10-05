import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz/policies";
import { getCurrentUser } from "@/lib/current-user";
import { ServicesScreen } from "./services-screen";

export const metadata: Metadata = { title: "Serviços · Agenda da Barbearia" };

export default async function Page() {
  // The catalog screen is admin-only (SPEC-0001); professionals still read the
  // services through the API, for the booking form.
  const user = await getCurrentUser();
  if (!user || !can(user, "service", "create")) {
    notFound();
  }
  return <ServicesScreen canManage />;
}
