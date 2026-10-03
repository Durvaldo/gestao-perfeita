<?php

namespace Database\Factories;

use App\Models\Cliente;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Cliente>
 */
class ClienteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'nome' => fake()->name(),
            'telefone' => fake()->numerify('(##) 9####-####'),
            'email' => fake()->optional()->safeEmail(),
            'data_nascimento' => fake()->optional()->date(),
            'observacoes' => fake()->optional()->sentence(),
        ];
    }
}
