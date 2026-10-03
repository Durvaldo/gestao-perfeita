import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/current-user";
import { OrdersScreen } from "./orders-screen";

export const metadata: Metadata = { title: "Comandas · Agenda da Barbearia" };

export default async function Page() {
  // The layout already guarantees a signed-in user with a tenant.
  const user = (await getCurrentUser())!;
  return <OrdersScreen ownProfessionalId={user.role === "professional" ? (user.professional?.id ?? null) : null} />;
}
