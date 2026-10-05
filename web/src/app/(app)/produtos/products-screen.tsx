"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { AppModal } from "@/components/app-modal";
import { useConfirm } from "@/components/confirm-provider";
import { FormError, FormField, PageHeader, PaginationBar, TableState } from "@/components/crud/crud-parts";
import { usePaginated } from "@/components/crud/use-paginated";
import { DecimalInput } from "@/components/decimal-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { toastError, toastSuccess } from "@/lib/toast";
import { EMPTY_PRODUCT_FORM, type ProductForm, productFormToBody, productToForm, type StockMode } from "./product-form";

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  stockQuantity: number | null;
  active: boolean;
};

const STOCK_MODES: { value: StockMode; label: string; hint: string }[] = [
  { value: "tracked", label: "Registrar quantidade", hint: "O sistema baixa o estoque a cada venda." },
  { value: "free", label: "Estoque livre", hint: "Vende sem limite de quantidade." },
];

export function ProductsScreen({ canManage }: { canManage: boolean }) {
  const confirm = useConfirm();
  const { items, meta, setPage, loading, reload } = usePaginated<Product>("/api/products");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_PRODUCT_FORM);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openForm(product: Product | null) {
    setEditing(product);
    setForm(product ? productToForm(product) : EMPTY_PRODUCT_FORM);
    setErrors({});
    setFormError(null);
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const request = productFormToBody(form);
    if (!request.ok) {
      setErrors(request.errors);
      setFormError(null);
      return;
    }
    setSaving(true);
    const response = await api<Product>(editing ? `/api/products/${editing.id}` : "/api/products", {
      method: editing ? "PUT" : "POST",
      body: request.body,
    });
    setSaving(false);
    if (!response.ok) {
      setErrors(response.errors);
      setFormError(response.message);
      return;
    }
    toastSuccess(editing ? "Produto atualizado." : "Produto cadastrado.");
    setOpen(false);
    reload();
  }

  async function remove(product: Product) {
    const ok = await confirm({ title: `Excluir ${product.name}?`, description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir" });
    if (!ok) return;
    const response = await api(`/api/products/${product.id}`, { method: "DELETE" });
    if (!response.ok) {
      toastError(response.message);
      return;
    }
    toastSuccess("Produto excluído.");
    reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Produtos"
        description="Produtos vendidos na barbearia."
        action={
          canManage ? (
            <Button onClick={() => openForm(null)}>
              <Plus className="size-4" />
              Novo produto
            </Button>
          ) : null
        }
      />

      <Card className="gap-0 overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
              {canManage ? <TableHead className="text-end">Ações</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState loading={loading} empty={items.length === 0} columns={canManage ? 5 : 4} emptyText="Nenhum produto cadastrado." />
            {!loading &&
              items.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{formatCurrency(product.price)}</TableCell>
                  <TableCell>{product.stockQuantity ?? <span className="text-muted-foreground">Livre</span>}</TableCell>
                  <TableCell>
                    <Badge variant={product.active ? "default" : "secondary"}>{product.active ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-end">
                      <Button variant="ghost" size="sm" onClick={() => openForm(product)}>
                        <Pencil className="size-4" />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(product)}>
                        <Trash2 className="size-4" />
                        Excluir
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <PaginationBar meta={meta} onPage={setPage} />
      </Card>

      <AppModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Editar produto" : "Novo produto"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="product-form" disabled={saving}>
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormError message={formError} />
          </div>
          <FormField id="name" label="Nome" errors={errors.name} className="sm:col-span-2">
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField id="price" label="Preço (R$)" errors={errors.price}>
            <DecimalInput id="price" value={form.price} onChange={(price) => setForm({ ...form, price })} />
          </FormField>
          <fieldset className="grid gap-2 sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">Estoque</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {STOCK_MODES.map((mode) => (
                <label
                  key={mode.value}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="stockMode"
                    value={mode.value}
                    checked={form.stockMode === mode.value}
                    onChange={() => setForm({ ...form, stockMode: mode.value })}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="block font-medium">{mode.label}</span>
                    <span className="text-muted-foreground">{mode.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {form.stockMode === "tracked" ? (
            <FormField id="stockQuantity" label="Quantidade em estoque" errors={errors.stockQuantity}>
              <Input
                id="stockQuantity"
                type="number"
                min={0}
                value={form.stockQuantity}
                onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
              />
            </FormField>
          ) : null}
          <FormField id="description" label="Descrição" errors={errors.description} className="sm:col-span-2">
            <Textarea id="description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch id="active" checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} />
            <Label htmlFor="active">Ativo</Label>
          </div>
        </form>
      </AppModal>
    </div>
  );
}
