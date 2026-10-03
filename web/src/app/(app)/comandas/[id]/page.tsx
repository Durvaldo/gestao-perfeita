import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/current-user";
import { OrderDetailScreen } from "./order-detail-screen";

export const metadata: Metadata = { title: "Comanda · Agenda da Barbearia" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The layout already guarantees a signed-in user with a tenant.
  const user = (await getCurrentUser())!;
  return <OrderDetailScreen orderId={id} timeZone={user.tenant?.timezone ?? "America/Sao_Paulo"} />;
}
