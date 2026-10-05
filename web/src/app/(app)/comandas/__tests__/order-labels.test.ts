import { describe, expect, test } from "vitest";
import { isOutOfStock, stockLabel } from "../order-labels";

describe("product stock in the order's select (SPEC-0002)", () => {
  test("shows the remaining stock of a tracked product", () => {
    expect(stockLabel({ stockQuantity: 3 })).toBe(" · estoque 3");
    expect(isOutOfStock({ stockQuantity: 3 })).toBe(false);
  });

  test("a tracked product with no units left is out of stock", () => {
    expect(stockLabel({ stockQuantity: 0 })).toBe(" · sem estoque");
    expect(isOutOfStock({ stockQuantity: 0 })).toBe(true);
  });

  test("a product without stock control is never out of stock", () => {
    expect(stockLabel({ stockQuantity: null })).toBe("");
    expect(isOutOfStock({ stockQuantity: null })).toBe(false);
    expect(isOutOfStock({})).toBe(false);
  });
});
