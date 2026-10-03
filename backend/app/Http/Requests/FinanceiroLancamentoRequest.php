<?php

namespace App\Http\Requests;

use App\Models\FinanceiroLancamento;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FinanceiroLancamentoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $lancamento = $this->route('financeiro_lancamento');

        return $lancamento instanceof FinanceiroLancamento
            ? $this->user()->can('update', $lancamento)
            : $this->user()->can('create', FinanceiroLancamento::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'tipo' => ['required', Rule::in(['receita', 'despesa'])],
            'categoria' => ['required', 'string', 'max:255'],
            'descricao' => ['nullable', 'string'],
            'valor' => ['required', 'numeric', 'min:0'],
            'data' => ['required', 'date'],
        ];
    }
}
