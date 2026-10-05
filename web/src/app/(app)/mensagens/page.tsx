import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz/policies";
import { getCurrentUser } from "@/lib/current-user";
import { MessagesScreen } from "./messages-screen";

export const metadata: Metadata = { title: "Mensagens · Agenda da Barbearia" };

export default async function Page() {
  // Editing the WhatsApp templates is admin-only (SPEC-0008).
  const user = await getCurrentUser();
  if (!user || !can(user, "messageTemplate", "update")) {
    notFound();
  }
  return <MessagesScreen barbershop={user.tenant?.name ?? ""} />;
}
