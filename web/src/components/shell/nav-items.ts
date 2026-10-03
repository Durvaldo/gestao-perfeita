import {
  Boxes,
  CalendarDays,
  Coins,
  type LucideIcon,
  LayoutDashboard,
  Receipt,
  Scissors,
  Sparkles,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only admins see it (financial data, ADR-0006). */
  adminOnly?: boolean;
};

// Same menu as the legacy AppLayout.vue. URLs and labels are user-facing (pt-BR).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/comandas", label: "Comandas", icon: Receipt },
  { href: "/financeiro", label: "Financeiro", icon: Coins, adminOnly: true },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/barbeiros", label: "Barbeiros", icon: Scissors },
  { href: "/servicos", label: "Serviços", icon: Sparkles },
  { href: "/produtos", label: "Produtos", icon: Boxes },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
