import { describe, expect, test } from "vitest";
import { appointmentVariables, DEFAULT_TEMPLATES, renderTemplate, whatsappUrl } from "@/lib/whatsapp";

describe("WhatsApp messages (SPEC-0008)", () => {
  test("fills the template variables; unknown ones stay as typed", () => {
    expect(renderTemplate("Oi, {cliente}! {data} às {hora}. {outra}", { cliente: "João", data: "10/01/2030", hora: "10:00" })).toBe(
      "Oi, João! 10/01/2030 às 10:00. {outra}",
    );
  });

  test("appointment variables use the barbershop's time zone and first names", () => {
    const vars = appointmentVariables(
      {
        startsAt: "2030-01-10T13:00:00.000Z", // 10:00 in São Paulo
        customer: { name: "João Pereira" },
        professional: { user: { name: "Carlos Souza" } },
        services: [{ name: "Corte" }, { name: "Barba" }],
      },
      "Barbearia Centro",
      "America/Sao_Paulo",
    );
    expect(vars).toEqual({ cliente: "João", barbearia: "Barbearia Centro", profissional: "Carlos", data: "10/01/2030", hora: "10:00", servicos: "Corte, Barba" });
    expect(renderTemplate(DEFAULT_TEMPLATES.appointmentReminder, vars)).toBe(
      "Olá, João! Lembrete do seu horário na Barbearia Centro: 10/01/2030 às 10:00, com Carlos. Até lá!",
    );
  });

  test("wa.me link adds the country code and encodes the text", () => {
    expect(whatsappUrl("11987654321", "Olá, João! 10:00 & tal")).toBe("https://wa.me/5511987654321?text=Ol%C3%A1%2C%20Jo%C3%A3o!%2010%3A00%20%26%20tal");
    expect(whatsappUrl("(11) 3333-4444", "x")).toBe("https://wa.me/551133334444?text=x");
  });

  test("no link without a valid phone", () => {
    expect(whatsappUrl("123", "x")).toBeNull();
    expect(whatsappUrl(null, "x")).toBeNull();
  });
});
