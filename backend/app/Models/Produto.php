<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Database\Factories\ProdutoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['tenant_id', 'nome', 'descricao', 'preco', 'estoque_qtd', 'ativo'])]
class Produto extends Model
{
    /** @use HasFactory<ProdutoFactory> */
    use BelongsToTenant, HasFactory;

    protected function casts(): array
    {
        return [
            'preco' => 'decimal:2',
            'estoque_qtd' => 'integer',
            'ativo' => 'boolean',
        ];
    }
}
