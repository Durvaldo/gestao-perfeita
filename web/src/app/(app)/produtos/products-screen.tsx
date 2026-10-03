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

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  stockQuantity: number | null;
  active: boolean;
};

type Form = { name: string; description: string; price: string | null; stockQuantity: string; active: boolean };
const EMPTY: Form = { name: "", description: "", price: null, stockQuantity: "", active: true };

export function ProductsScreen({ canManage }: { canManage: boolean }) {
  const confirm = useConfirm();
  const { items, meta, setPage, loading, reload } = usePaginated<Product>("/api/products");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openForm(product: Product | null) {
    setEditing(product);
    setForm(
      product
        ? {
            name: product.name,
            description: product.description ?? "",
            price: product.price,
            stockQuantity: product.stockQuantity === null ? "" : String(product.stockQuantity),
            active: product.active,
          }
        : EMPTY,
    );
    setErrors({});
    setFormError(null);
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    // An empty stock field is sent as "" → null: stock not tracked.
    const response = await api<Product>(editing ? `/api/products/${editing.id}` : "/api/products", {
      method: editing ? "PUT" : "POST",
      body: form,
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
                  <TableCell>{product.stockQuantity ?? <span className="text-muted-foreground">Sem controle</span>}</TableCell>
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
          <FormField id="stockQuantity" label="Estoque (vazio = sem controle)" errors={errors.stockQuantity}>
            <Input
              id="stockQuantity"
              type="number"
              min={0}
              value={form.stockQuantity}
              onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
            />
          </FormField>
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
