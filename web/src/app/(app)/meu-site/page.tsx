import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz/policies";
import { getCurrentUser } from "@/lib/current-user";
import { SiteScreen } from "./site-screen";

export const metadata: Metadata = { title: "Meu site · Agenda da Barbearia" };

export default async function Page() {
  // Customizing the public site is admin-only (SPEC-0007).
  const user = await getCurrentUser();
  if (!user || !can(user, "siteSettings", "update")) {
    notFound();
  }
  return <SiteScreen />;
}
