"use client";

import { ArrowLeft, Plus, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { FormError, FormField } from "@/components/crud/crud-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CARD_TABLE_CLASS } from "@/lib/table-styles";
import { api, apiAll } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import { zonedParts } from "@/lib/timezone";
import { toastError, toastSuccess } from "@/lib/toast";
import { isOutOfStock, ORDER_STATUS_LABEL, orderStatusVariant, PAYMENT_METHOD_LABEL, stockLabel } from "../order-labels";

type Item = {
  id: number;
  type: "service" | "product";
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  service: { name: string } | null;
  product: { name: string } | null;
};
type Order = {
  id: number;
  status: string;
  totalAmount: string;
  paymentMethod: string | null;
  paidAt: string | null;
  customer: { name: string };
  professional: { user: { name: string } };
  items: Item[];
};
type Catalog = { id: number; name: string; price: string; active: boolean; stockQuantity?: number | null };

/** Order detail: items, add/remove, close with payment method (legacy ComandaDetailView.vue). */
export function OrderDetailScreen({ orderId, timeZone }: { orderId: string; timeZone: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [services, setServices] = useState<Catalog[]>([]);
  const [products, setProducts] = useState<Catalog[]>([]);
  const [itemForm, setItemForm] = useState({ type: "service", serviceId: "", productId: "", quantity: "1" });
  const [itemErrors, setItemErrors] = useState<Record<string, string[]>>({});
  const [itemError, setItemError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [closeError, setCloseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<Order>(`/api/orders/${orderId}`).then((response) => {
      if (cancelled) return;
      if (response.ok) setOrder(response.data);
      else setLoadError(response.message);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId, version]);

  // Reloaded with the order (`version`), so the stock shown in the select follows
  // every item added or removed (SPEC-0002).
  useEffect(() => {
    let cancelled = false;
    Promise.all([apiAll<Catalog>("/api/services"), apiAll<Catalog>("/api/products")]).then(([s, p]) => {
      if (cancelled) return;
      if (s.ok) setServices(s.data.filter((x) => x.active));
      if (p.ok) {
        const active = p.data.filter((x) => x.active);
        setProducts(active);
        // A selected product that just ran out can't be added again.
        setItemForm((form) => {
          const selected = active.find((x) => String(x.id) === form.productId);
          return selected && isOutOfStock(selected) ? { ...form, productId: "" } : form;
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const reload = () => setVersion((v) => v + 1);

  async function addItem(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const isProduct = itemForm.type === "product";
    const response = await api(`/api/orders/${orderId}/items`, {
      method: "POST",
      body: {
        type: itemForm.type,
        serviceId: isProduct ? null : itemForm.serviceId || null,
        productId: isProduct ? itemForm.productId || null : null,
        quantity: itemForm.quantity,
      },
    });
    setBusy(false);
    if (!response.ok) {
      setItemErrors(response.errors);
      setItemError(response.message);
      return;
    }
    setItemErrors({});
    setItemError(null);
    setItemForm({ ...itemForm, quantity: "1" });
    toastSuccess("Item adicionado.");
    reload();
  }

  async function removeItem(item: Item) {
    const response = await api(`/api/orders/${orderId}/items/${item.id}`, { method: "DELETE" });
    if (!response.ok) {
      toastError(response.message);
      return;
    }
    toastSuccess("Item removido.");
    reload();
  }

  async function close(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await api(`/api/orders/${orderId}/close`, { method: "POST", body: { paymentMethod } });
    setBusy(false);
    if (!response.ok) {
      setCloseError(response.message);
      return;
    }
    setCloseError(null);
    toastSuccess("Comanda fechada e lançada no financeiro.");
    reload();
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <p className="text-muted-foreground">{loadError}</p>
      </div>
    );
  }
  if (!order) {
    return <Skeleton className="h-64 w-full" />;
  }

  const isOpen = order.status === "open";
  const itemName = (item: Item) => (item.type === "service" ? item.service?.name : item.product?.name) ?? "—";

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comanda #{order.id}</h1>
          <p className="text-muted-foreground">
            {order.customer.name} · {order.professional.user.name}
          </p>
        </div>
        <div className="text-end">
          <Badge variant={orderStatusVariant(order.status)}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(order.totalAmount)}</p>
          {order.status === "paid" && order.paidAt ? (
            <p className="text-sm text-muted-foreground">
              {PAYMENT_METHOD_LABEL[order.paymentMethod ?? ""] ?? order.paymentMethod} · pago em{" "}
              {formatDate(zonedParts(new Date(order.paidAt), timeZone).date)}
            </p>
          ) : null}
        </div>
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        <Table className={CARD_TABLE_CLASS}>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-end">Qtd.</TableHead>
              <TableHead className="text-end">Unitário</TableHead>
              <TableHead className="text-end">Total</TableHead>
              {isOpen ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isOpen ? 6 : 5} className="py-8 text-center text-muted-foreground">
                  Nenhum item na comanda.
                </TableCell>
              </TableRow>
            ) : null}
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{itemName(item)}</TableCell>
                <TableCell>{item.type === "service" ? "Serviço" : "Produto"}</TableCell>
                <TableCell className="text-end">{item.quantity}</TableCell>
                <TableCell className="text-end">{formatCurrency(item.unitPrice)}</TableCell>
                <TableCell className="text-end">{formatCurrency(item.totalPrice)}</TableCell>
                {isOpen ? (
                  <TableCell className="text-end">
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeItem(item)} aria-label="Remover item">
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {isOpen ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Adicionar item</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addItem} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormError message={itemError} />
                </div>
                <FormField id="itemType" label="Tipo">
                  <Select value={itemForm.type} onValueChange={(type) => setItemForm({ ...itemForm, type })}>
                    <SelectTrigger id="itemType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Serviço</SelectItem>
                      <SelectItem value="product">Produto</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField id="quantity" label="Quantidade" errors={itemErrors.quantity}>
                  <Input id="quantity" type="number" min={1} value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                </FormField>
                {itemForm.type === "service" ? (
                  <FormField id="serviceId" label="Serviço" errors={itemErrors.serviceId} className="sm:col-span-2">
                    <Select value={itemForm.serviceId} onValueChange={(serviceId) => setItemForm({ ...itemForm, serviceId })}>
                      <SelectTrigger id="serviceId" className="w-full">
                        <SelectValue placeholder="Selecione o serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name} · {formatCurrency(s.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                ) : (
                  <FormField id="productId" label="Produto" errors={itemErrors.productId} className="sm:col-span-2">
                    <Select value={itemForm.productId} onValueChange={(productId) => setItemForm({ ...itemForm, productId })}>
                      <SelectTrigger id="productId" className="w-full">
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)} disabled={isOutOfStock(p)}>
                            {p.name} · {formatCurrency(p.price)}
                            {stockLabel(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
                <Button type="submit" variant="outline" disabled={busy} className="sm:col-span-2">
                  <Plus className="size-4" />
                  Adicionar
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fechar comanda</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={close} className="grid gap-4">
                <FormError message={closeError} />
                <FormField id="paymentMethod" label="Forma de pagamento">
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="paymentMethod" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <Button type="submit" disabled={busy}>
                  <Wallet className="size-4" />
                  Fechar comanda · {formatCurrency(order.totalAmount)}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="w-fit">
      <Link href="/comandas">
        <ArrowLeft className="size-4" />
        Comandas
      </Link>
    </Button>
  );
}
