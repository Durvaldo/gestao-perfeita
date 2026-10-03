<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Database\Factories\FinanceiroLancamentoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['tenant_id', 'tipo', 'categoria', 'descricao', 'valor', 'data'])]
class FinanceiroLancamento extends Model
{
    /** @use HasFactory<FinanceiroLancamentoFactory> */
    use BelongsToTenant, HasFactory;

    protected function casts(): array
    {
        return [
            'valor' => 'decimal:2',
            'data' => 'date',
        ];
    }
}
