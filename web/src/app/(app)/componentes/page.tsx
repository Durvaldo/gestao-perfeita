import { notFound } from "next/navigation";
import { ComponentsShowcase } from "./showcase";

// Development-only reference of the base components (TASK-0010). Not in the menu.
export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <ComponentsShowcase />;
}
