<?php

namespace App\Http\Requests;

use App\Models\Agendamento;
use App\Models\Barbeiro;
use App\Models\Cliente;
use App\Models\Comanda;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ComandaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', Comanda::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'agendamento_id' => ['nullable', 'integer', $this->existsInTenant(Agendamento::class)],
            'cliente_id' => ['required_without:agendamento_id', 'integer', $this->existsInTenant(Cliente::class)],
            'barbeiro_id' => ['required_without:agendamento_id', 'integer', $this->existsInTenant(Barbeiro::class)],
        ];
    }

    private function existsInTenant(string $modelClass): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail) use ($modelClass) {
            if (! $modelClass::find($value)) {
                $fail('O valor selecionado é inválido.');
            }
        };
    }
}
