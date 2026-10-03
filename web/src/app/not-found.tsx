import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// pt-BR replacement for Next's default 404 (also used by notFound() in pages).
export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <SearchX className="size-6 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">Página não encontrada</h1>
        <p className="text-muted-foreground">O endereço não existe ou você não tem acesso a ele.</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}
