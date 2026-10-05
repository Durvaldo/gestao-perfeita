import {
  Boxes,
  CalendarDays,
  CalendarOff,
  Coins,
  type LucideIcon,
  LayoutDashboard,
  MessageCircle,
  Receipt,
  Scissors,
  Sparkles,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only admins see it (financial data and catalog screens, ADR-0006 / SPEC-0001). */
  adminOnly?: boolean;
  /** Label shown to professionals instead of `label`, when the screen means something else to them. */
  professionalLabel?: string;
};

// URLs and labels are user-facing (pt-BR).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  // Holidays, days off, sick leave (SPEC-0004).
  { href: "/excecoes", label: "Exceções", icon: CalendarOff, professionalLabel: "Minhas folgas" },
  { href: "/comandas", label: "Comandas", icon: Receipt },
  { href: "/financeiro", label: "Financeiro", icon: Coins, adminOnly: true },
  // WhatsApp message templates (SPEC-0008).
  { href: "/mensagens", label: "Mensagens", icon: MessageCircle, adminOnly: true },
  { href: "/clientes", label: "Clientes", icon: Users },
  // A professional only sees their own record here, to manage their working hours (SPEC-0001).
  { href: "/barbeiros", label: "Barbeiros", icon: Scissors, professionalLabel: "Meus horários" },
  { href: "/servicos", label: "Serviços", icon: Sparkles, adminOnly: true },
  { href: "/produtos", label: "Produtos", icon: Boxes, adminOnly: true },
];

/** The menu items `isAdmin` sees, each with the label to display. */
export function visibleNavItems(isAdmin: boolean): (NavItem & { displayLabel: string })[] {
  return NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly).map((item) => ({
    ...item,
    displayLabel: !isAdmin && item.professionalLabel ? item.professionalLabel : item.label,
  }));
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
