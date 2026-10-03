<?php

namespace App\Http\Requests;

use App\Models\Comanda;
use App\Models\Produto;
use App\Models\Servico;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ComandaItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('comanda'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'tipo' => ['required', Rule::in(['servico', 'produto'])],
            'servico_id' => ['nullable', 'required_if:tipo,servico', 'integer', $this->existsInTenant(Servico::class)],
            'produto_id' => ['nullable', 'required_if:tipo,produto', 'integer', $this->existsInTenant(Produto::class)],
            'quantidade' => ['nullable', 'integer', 'min:1'],
        ];
    }

    private function existsInTenant(string $modelClass): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail) use ($modelClass) {
            if ($value !== null && ! $modelClass::find($value)) {
                $fail('O valor selecionado é inválido.');
            }
        };
    }
}
