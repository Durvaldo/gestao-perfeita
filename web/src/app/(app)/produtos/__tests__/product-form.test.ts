import { describe, expect, test } from "vitest";
import { EMPTY_PRODUCT_FORM, productFormToBody, productToForm } from "../product-form";

const product = { name: "Pomada", description: null, price: "39.90", active: true };

describe("product form stock mode (SPEC-0002)", () => {
  test("a new product starts as 'Registrar quantidade'", () => {
    expect(EMPTY_PRODUCT_FORM.stockMode).toBe("tracked");
  });

  test("'Estoque livre' sends an empty quantity, stored as null", () => {
    const result = productFormToBody({ ...EMPTY_PRODUCT_FORM, stockMode: "free", stockQuantity: "7" });
    expect(result).toEqual({ ok: true, body: expect.objectContaining({ stockQuantity: "" }) });
    expect(result.ok && "stockMode" in result.body).toBe(false);
  });

  test("'Registrar quantidade' requires a quantity", () => {
    expect(productFormToBody({ ...EMPTY_PRODUCT_FORM, stockQuantity: " " })).toEqual({
      ok: false,
      errors: { stockQuantity: ["Informe a quantidade em estoque ou escolha estoque livre."] },
    });
    expect(productFormToBody({ ...EMPTY_PRODUCT_FORM, stockQuantity: "0" })).toEqual({
      ok: true,
      body: expect.objectContaining({ stockQuantity: "0" }),
    });
  });

  test("editing opens on the product's mode", () => {
    expect(productToForm({ ...product, stockQuantity: null })).toMatchObject({ stockMode: "free", stockQuantity: "" });
    expect(productToForm({ ...product, stockQuantity: 12 })).toMatchObject({ stockMode: "tracked", stockQuantity: "12" });
  });
});
