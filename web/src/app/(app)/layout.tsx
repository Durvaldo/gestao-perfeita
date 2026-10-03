import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { NoTenantNotice } from "@/components/shell/no-tenant-notice";
import { AppShell } from "@/components/shell/app-shell";
import { can } from "@/lib/authz/policies";
import { getCurrentUser } from "@/lib/current-user";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  professional: "Profissional",
  super_admin: "Super administrador",
  customer: "Cliente",
};

// Route guard for every panel page (server side, authoritative): no session →
// /login. The API checks again on every request (ADR-0006/0007).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // super_admin has no tenant: the barbershop panel does not apply to them.
  if (user.tenantId === null) {
    return <NoTenantNotice name={user.name} />;
  }

  return (
    <AppShell
      tenantName={user.tenant?.name ?? "Barbearia"}
      user={{
        name: user.name,
        email: user.email,
        roleLabel: ROLE_LABELS[user.role] ?? user.role,
        isAdmin: can(user, "financialEntry", "viewAny"),
      }}
    >
      {children}
    </AppShell>
  );
}
