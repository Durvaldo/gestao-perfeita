<?php

namespace App\Models;

use Database\Factories\PlanoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['nome', 'descricao', 'preco_mensal', 'limite_barbeiros', 'limite_clientes', 'ativo'])]
class Plano extends Model
{
    /** @use HasFactory<PlanoFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'preco_mensal' => 'decimal:2',
            'limite_barbeiros' => 'integer',
            'limite_clientes' => 'integer',
            'ativo' => 'boolean',
        ];
    }

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);
    }
}
