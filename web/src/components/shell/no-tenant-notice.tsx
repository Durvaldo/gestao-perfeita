import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "./sign-out-button";

/** Shown to users without a tenant (super_admin): the panel is per barbershop. */
export function NoTenantNotice({ name }: { name: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Olá, {name}</CardTitle>
          <CardDescription>
            Este painel é usado pelas barbearias. Sua conta não está vinculada a nenhuma barbearia, então não há nada para
            mostrar aqui por enquanto.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <SignOutButton />
        </div>
      </Card>
    </main>
  );
}
