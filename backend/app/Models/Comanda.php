<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Database\Factories\ComandaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'agendamento_id', 'cliente_id', 'barbeiro_id', 'valor_total', 'forma_pagamento', 'status'])]
class Comanda extends Model
{
    /** @use HasFactory<ComandaFactory> */
    use BelongsToTenant, HasFactory;

    protected function casts(): array
    {
        return [
            'valor_total' => 'decimal:2',
        ];
    }

    public function agendamento(): BelongsTo
    {
        return $this->belongsTo(Agendamento::class);
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function barbeiro(): BelongsTo
    {
        return $this->belongsTo(Barbeiro::class);
    }

    public function itens(): HasMany
    {
        return $this->hasMany(ComandaItem::class);
    }
}
