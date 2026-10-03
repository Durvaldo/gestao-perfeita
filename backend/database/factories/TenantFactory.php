<?php

namespace Database\Factories;

use App\Models\Plano;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'plano_id' => Plano::factory(),
            'nome' => 'Barbearia '.fake()->unique()->company(),
            'slug' => fake()->unique()->slug(),
            'cnpj_cpf' => fake()->numerify('##.###.###/0001-##'),
            'telefone' => fake()->numerify('(##) 9####-####'),
            'endereco' => fake()->address(),
            'status' => 'ativo',
        ];
    }
}
