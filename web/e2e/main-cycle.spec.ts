import { expect, type Page, test } from "@playwright/test";
import { addDays, dayMonthLabel, startOfWeek } from "../src/lib/calendar";
import { zonedParts } from "../src/lib/timezone";

// Main business cycle, through the real UI (TASK-0019):
// login → book an appointment → open an order from it → add a product → close →
// see it in the financial report and on the dashboard. Plus the professional's
// restricted view. Uses the seeded TEST database (see playwright.config.ts).

const PASSWORD = "senha123"; // seed dev password (prisma/seed-data.ts)
const money = (value: string) => new RegExp(`R\\$\\s${value.replace(".", "\\.")}`);

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function pick(page: Page, trigger: string, option: string | RegExp) {
  await page.locator(trigger).click();
  await page.getByRole("option", { name: option }).click();
}

test("main cycle: appointment → order → payment → financial report and dashboard", async ({ page }) => {
  await login(page, "admin@barbearia-centro.com");

  // Agenda: next week's Monday at 10:00, barbershop time (the browser runs in Tokyo).
  const today = zonedParts(new Date(), "America/Sao_Paulo").date;
  const nextMonday = addDays(startOfWeek(today), 7);
  await page.goto("/agenda");
  await page.getByRole("combobox", { name: "Barbeiro" }).click();
  await page.getByRole("option", { name: "Carlos Souza" }).click();
  await page.getByRole("button", { name: "Próximo período" }).click();
  await page.getByRole("button", { name: `${dayMonthLabel(nextMonday)} 10:00` }).click();

  await expect(page.locator("#startsAt")).toHaveValue(`${nextMonday}T10:00`);
  await pick(page, "#customerId", "João Pereira");
  await page.locator("label", { hasText: /^Corte30 min/ }).locator("input").check();
  await page.getByRole("button", { name: "Agendar" }).click();

  const block = page.getByRole("button", { name: /10:00 João Pereira/ });
  await expect(block).toBeVisible();

  // Order from the appointment, prefilled with its service.
  await block.click();
  await page.getByRole("button", { name: "Criar comanda" }).click();
  await expect(page).toHaveURL(/\/comandas\/\d+$/);
  await expect(page.getByRole("cell", { name: "Corte", exact: true })).toBeVisible();

  // Add a product and close with Pix.
  await pick(page, "#itemType", "Produto");
  await pick(page, "#productId", /Pomada modeladora/);
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Pomada modeladora" })).toBeVisible();
  await expect(page.getByText(money("84,90")).first()).toBeVisible(); // 45,00 + 39,90
  await page.getByRole("button", { name: /Fechar comanda/ }).click();
  await expect(page.getByText("Paga", { exact: true })).toBeVisible();
  await expect(page.getByText(/Pix · pago em/)).toBeVisible();

  // Financial report: income and Carlos' commission (40% of the 45,00 service).
  await page.goto("/financeiro");
  await expect(page.locator('[data-slot="card-header"]', { hasText: /^Receitas/ })).toContainText(money("84,90"));
  await expect(page.getByRole("row", { name: /Carlos Souza/ })).toContainText(money("18,00"));

  // Dashboard: the sale counts.
  await page.goto("/");
  const services = page.locator('[data-slot="card"]', { hasText: "Serviços mais vendidos" });
  await expect(services).toContainText("Corte");
  const ranking = page.locator('[data-slot="card"]', { hasText: "Ranking de barbeiros" });
  await expect(ranking).toContainText(money("84,90"));
});

test("a professional sees their own agenda and no financial data", async ({ page }) => {
  await login(page, "carlos@barbearia-centro.com");

  await expect(page.getByRole("link", { name: "Financeiro" })).toHaveCount(0);
  await page.goto("/agenda");
  await expect(page.getByText("Sua agenda.")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Barbeiro" })).toHaveCount(0);

  await page.goto("/financeiro");
  await expect(page.getByText("Página não encontrada")).toBeVisible();
});

test("a professional does not see the catalog screens nor their colleagues (SPEC-0001)", async ({ page }) => {
  await login(page, "carlos@barbearia-centro.com");

  for (const name of ["Serviços", "Produtos", "Barbeiros"]) {
    await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
  }
  for (const path of ["/servicos", "/produtos"]) {
    await page.goto(path);
    await expect(page.getByText("Página não encontrada")).toBeVisible();
  }

  await page.getByRole("link", { name: "Meus horários" }).click();
  await expect(page.getByRole("heading", { name: "Meus horários" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Carlos Souza", exact: true })).toHaveCount(1);
  await expect(page.getByRole("cell", { name: "Rafael Lima", exact: true })).toHaveCount(0);
});

test("wrong password shows the pt-BR error", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill("admin@barbearia-centro.com");
  await page.locator("#password").fill("errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Essas credenciais não conferem com nossos registros.")).toBeVisible();
});
