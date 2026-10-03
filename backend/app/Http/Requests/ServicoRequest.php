<?php

namespace App\Http\Requests;

use App\Models\Servico;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ServicoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $servico = $this->route('servico');

        return $servico instanceof Servico
            ? $this->user()->can('update', $servico)
            : $this->user()->can('create', Servico::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:255'],
            'descricao' => ['nullable', 'string'],
            'duracao_minutos' => ['required', 'integer', 'min:1'],
            'preco' => ['required', 'numeric', 'min:0'],
            'ativo' => ['boolean'],
        ];
    }
}
