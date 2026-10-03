import type { Metadata } from "next";
import { can } from "@/lib/authz/policies";
import { getCurrentUser } from "@/lib/current-user";
import { ProductsScreen } from "./products-screen";

export const metadata: Metadata = { title: "Produtos · Agenda da Barbearia" };

export default async function Page() {
  // The layout already guarantees a signed-in user with a tenant.
  const user = (await getCurrentUser())!;
  return <ProductsScreen canManage={can(user, "product", "create")} />;
}
