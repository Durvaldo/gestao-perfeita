<?php

namespace App\Models;

use Database\Factories\HorarioTrabalhoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['barbeiro_id', 'dia_semana', 'hora_inicio', 'hora_fim'])]
class HorarioTrabalho extends Model
{
    /** @use HasFactory<HorarioTrabalhoFactory> */
    use HasFactory;

    protected $table = 'horarios_trabalho';

    protected function casts(): array
    {
        return [
            'dia_semana' => 'integer',
        ];
    }

    public function barbeiro(): BelongsTo
    {
        return $this->belongsTo(Barbeiro::class);
    }
}
