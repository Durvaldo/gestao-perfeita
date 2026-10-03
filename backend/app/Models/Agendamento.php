<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Database\Factories\AgendamentoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['tenant_id', 'cliente_id', 'barbeiro_id', 'data_hora_inicio', 'data_hora_fim', 'status', 'criado_por_user_id', 'observacoes'])]
class Agendamento extends Model
{
    /** @use HasFactory<AgendamentoFactory> */
    use BelongsToTenant, HasFactory;

    protected function casts(): array
    {
        return [
            'data_hora_inicio' => 'datetime',
            'data_hora_fim' => 'datetime',
        ];
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function barbeiro(): BelongsTo
    {
        return $this->belongsTo(Barbeiro::class);
    }

    public function criadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por_user_id');
    }

    public function servicos(): BelongsToMany
    {
        return $this->belongsToMany(Servico::class, 'agendamento_servico')
            ->withPivot('preco_no_momento')
            ->withTimestamps();
    }

    public function comanda(): HasOne
    {
        return $this->hasOne(Comanda::class);
    }

    /**
     * Whether the time range fits entirely inside ONE of the barbeiro's work
     * periods for that weekday (can't span the lunch gap nor midnight).
     * A barbeiro with no work period registered for the day accepts nothing.
     */
    public static function dentroDoExpediente(int $barbeiroId, \DateTimeInterface $inicio, \DateTimeInterface $fim): bool
    {
        if ($inicio->format('Y-m-d') !== $fim->format('Y-m-d')) {
            return false;
        }

        // String comparison is safe: times are zero-padded 'HH:MM:SS'.
        return HorarioTrabalho::query()
            ->where('barbeiro_id', $barbeiroId)
            ->where('dia_semana', (int) $inicio->format('w'))
            ->where('hora_inicio', '<=', $inicio->format('H:i:s'))
            ->where('hora_fim', '>=', $fim->format('H:i:s'))
            ->exists();
    }

    /**
     * Whether another (non-cancelled) agendamento for the same barbeiro overlaps this time range.
     */
    public static function conflita(int $barbeiroId, \DateTimeInterface $inicio, \DateTimeInterface $fim, ?int $ignorarId = null): bool
    {
        return static::query()
            ->where('barbeiro_id', $barbeiroId)
            ->where('status', '!=', 'cancelado')
            ->when($ignorarId, fn ($query) => $query->where('id', '!=', $ignorarId))
            ->where('data_hora_inicio', '<', $fim)
            ->where('data_hora_fim', '>', $inicio)
            ->exists();
    }
}
