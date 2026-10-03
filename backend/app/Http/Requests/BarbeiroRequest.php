<?php

namespace App\Http\Requests;

use App\Models\Barbeiro;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BarbeiroRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $barbeiro = $this->route('barbeiro');

        return $barbeiro instanceof Barbeiro
            ? $this->user()->can('update', $barbeiro)
            : $this->user()->can('create', Barbeiro::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'comissao_percentual_padrao' => ['required', 'numeric', 'min:0', 'max:100'],
            'foto_url' => ['nullable', 'url'],
            'ativo' => ['boolean'],
        ];

        if (! $this->route('barbeiro')) {
            $rules['name'] = ['required', 'string', 'max:255'];
            $rules['email'] = ['required', 'email', 'max:255', Rule::unique('users', 'email')];
            $rules['password'] = ['required', 'string', 'min:8'];
            $rules['telefone'] = ['nullable', 'string', 'max:30'];
        }

        return $rules;
    }
}
