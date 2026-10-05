// Plain module (no "use client"), so Server Components get the string itself.

/**
 * For a <Table> placed edge to edge inside a <Card className="p-0">: the first and
 * last cells use the card's own spacing (16px, --card-spacing) instead of the 8px
 * default, and rows are a bit taller, so the content doesn't touch the card border.
 */
export const CARD_TABLE_CLASS =
  "[&_td]:py-3 [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th]:h-11 [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)";
