import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz/policies";
import { getCurrentUser } from "@/lib/current-user";
import { ProductsScreen } from "./products-screen";

export const metadata: Metadata = { title: "Produtos · Agenda da Barbearia" };

export default async function Page() {
  // The catalog screen is admin-only (SPEC-0001); professionals still read the
  // products through the API, to add them to an order.
  const user = await getCurrentUser();
  if (!user || !can(user, "product", "create")) {
    notFound();
  }
  return <ProductsScreen canManage />;
}
