<?php

namespace App\Http\Requests;

use App\Models\Agendamento;
use App\Models\Barbeiro;
use App\Models\Cliente;
use App\Models\Servico;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AgendamentoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $agendamento = $this->route('agendamento');

        return $agendamento instanceof Agendamento
            ? $this->user()->can('update', $agendamento)
            : $this->user()->can('create', Agendamento::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'cliente_id' => ['required', 'integer', $this->existsInTenant(Cliente::class)],
            'barbeiro_id' => ['required', 'integer', $this->existsInTenant(Barbeiro::class)],
            'data_hora_inicio' => ['required', 'date'],
            'servico_ids' => ['required', 'array', 'min:1'],
            'servico_ids.*' => ['integer', $this->existsInTenant(Servico::class)],
            'observacoes' => ['nullable', 'string'],
            'status' => [Rule::in(['pendente', 'confirmado', 'concluido', 'cancelado'])],
        ];
    }

    /**
     * The route already runs inside a resolved tenant context, so Model::find()
     * naturally applies the BelongsToTenant scope — unlike a raw `exists:table,id`
     * validation rule, which would bypass it and let another tenant's id pass.
     */
    private function existsInTenant(string $modelClass): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail) use ($modelClass) {
            if (! $modelClass::find($value)) {
                $fail('O valor selecionado é inválido.');
            }
        };
    }
}
