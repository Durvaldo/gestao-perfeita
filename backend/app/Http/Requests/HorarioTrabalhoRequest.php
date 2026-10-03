<?php

namespace App\Http\Requests;

use App\Models\HorarioTrabalho;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class HorarioTrabalhoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $horarioTrabalho = $this->route('horario_trabalho');

        return $horarioTrabalho instanceof HorarioTrabalho
            ? $this->user()->can('update', $horarioTrabalho)
            : $this->user()->can('create', [HorarioTrabalho::class, $this->route('barbeiro')]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'dia_semana' => ['required', 'integer', 'between:0,6'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fim' => ['required', 'date_format:H:i', 'after:hora_inicio'],
        ];
    }
}
