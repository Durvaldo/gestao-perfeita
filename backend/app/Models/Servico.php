<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Database\Factories\ServicoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['tenant_id', 'nome', 'descricao', 'duracao_minutos', 'preco', 'ativo'])]
class Servico extends Model
{
    /** @use HasFactory<ServicoFactory> */
    use BelongsToTenant, HasFactory;

    protected function casts(): array
    {
        return [
            'duracao_minutos' => 'integer',
            'preco' => 'decimal:2',
            'ativo' => 'boolean',
        ];
    }

    public function barbeiros(): BelongsToMany
    {
        return $this->belongsToMany(Barbeiro::class, 'barbeiro_servico')
            ->withPivot(['comissao_percentual', 'preco_personalizado'])
            ->withTimestamps();
    }
}
