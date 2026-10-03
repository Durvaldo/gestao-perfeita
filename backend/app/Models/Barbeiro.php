<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Database\Factories\BarbeiroFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'user_id', 'comissao_percentual_padrao', 'foto_url', 'ativo'])]
class Barbeiro extends Model
{
    /** @use HasFactory<BarbeiroFactory> */
    use BelongsToTenant, HasFactory;

    protected function casts(): array
    {
        return [
            'comissao_percentual_padrao' => 'decimal:2',
            'ativo' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function servicos(): BelongsToMany
    {
        return $this->belongsToMany(Servico::class, 'barbeiro_servico')
            ->withPivot(['comissao_percentual', 'preco_personalizado'])
            ->withTimestamps();
    }

    public function horariosTrabalho(): HasMany
    {
        return $this->hasMany(HorarioTrabalho::class);
    }

    public function bloqueiosAgenda(): HasMany
    {
        return $this->hasMany(BloqueioAgenda::class);
    }

    public function agendamentos(): HasMany
    {
        return $this->hasMany(Agendamento::class);
    }
}
