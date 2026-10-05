import { useState } from "react";
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConfirmProvider, useConfirm } from "@/components/confirm-provider";
import { DecimalInput } from "@/components/decimal-input";
import { isActive, NAV_ITEMS, visibleNavItems } from "@/components/shell/nav-items";

afterEach(cleanup);

function DecimalHarness({ initial }: { initial: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <>
      <DecimalInput aria-label="preço" value={value} onChange={setValue} />
      <output data-testid="api-value">{JSON.stringify(value)}</output>
    </>
  );
}

describe("DecimalInput", () => {
  test("shows the value in pt-BR and emits the API string while typing", () => {
    render(<DecimalHarness initial="1234.5" />);
    const input = screen.getByLabelText("preço") as HTMLInputElement;
    expect(input.value).toBe("1.234,50");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "89,9" } });
    expect(screen.getByTestId("api-value").textContent).toBe('"89.9"');

    fireEvent.blur(input);
    expect(input.value).toBe("89,90");
  });

  test("clearing the field emits null", () => {
    render(<DecimalHarness initial="10" />);
    const input = screen.getByLabelText("preço");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByTestId("api-value").textContent).toBe("null");
  });
});

function ConfirmHarness() {
  const confirm = useConfirm();
  const [answer, setAnswer] = useState("none");
  return (
    <>
      <button onClick={async () => setAnswer(String(await confirm({ title: "Excluir cliente?", confirmLabel: "Excluir" })))}>
        abrir
      </button>
      <output data-testid="answer">{answer}</output>
    </>
  );
}

describe("ConfirmProvider", () => {
  test("resolves true on confirm and false on cancel", async () => {
    render(
      <ConfirmProvider>
        <ConfirmHarness />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByText("abrir"));
    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(screen.getByTestId("answer").textContent).toBe("true"));

    fireEvent.click(screen.getByText("abrir"));
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.getByTestId("answer").textContent).toBe("false"));
  });
});

describe("navigation", () => {
  test("the admin sees the whole menu", () => {
    expect(visibleNavItems(true).map((item) => item.displayLabel)).toEqual([
      "Dashboard",
      "Agenda",
      "Comandas",
      "Financeiro",
      "Clientes",
      "Barbeiros",
      "Serviços",
      "Produtos",
    ]);
    expect(NAV_ITEMS.filter((item) => item.adminOnly).map((item) => item.href)).toEqual(["/financeiro", "/servicos", "/produtos"]);
  });

  test("a professional sees only their own work (SPEC-0001)", () => {
    expect(visibleNavItems(false).map((item) => item.displayLabel)).toEqual([
      "Dashboard",
      "Agenda",
      "Comandas",
      "Clientes",
      "Meus horários",
    ]);
  });

  test("active item detection", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/clientes", "/")).toBe(false);
    expect(isActive("/comandas/12", "/comandas")).toBe(true);
    expect(isActive("/comandasx", "/comandas")).toBe(false);
  });
});
