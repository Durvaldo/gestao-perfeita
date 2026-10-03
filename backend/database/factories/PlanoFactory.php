<?php

namespace Database\Factories;

use App\Models\Plano;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Plano>
 */
class PlanoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nome' => fake()->randomElement(['Básico', 'Premium', 'Enterprise']).' '.fake()->unique()->numberBetween(1, 100000),
            'descricao' => fake()->sentence(),
            'preco_mensal' => fake()->randomFloat(2, 29.9, 199.9),
            'limite_barbeiros' => fake()->optional()->numberBetween(1, 10),
            'limite_clientes' => fake()->optional()->numberBetween(50, 1000),
            'ativo' => true,
        ];
    }
}
