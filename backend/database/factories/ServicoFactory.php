<?php

namespace Database\Factories;

use App\Models\Servico;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Servico>
 */
class ServicoFactory extends Factory
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
            'nome' => fake()->randomElement(['Corte', 'Barba', 'Corte + Barba', 'Sobrancelha', 'Pigmentação']),
            'descricao' => fake()->optional()->sentence(),
            'duracao_minutos' => fake()->randomElement([20, 30, 40, 60]),
            'preco' => fake()->randomFloat(2, 20, 150),
            'ativo' => true,
        ];
    }
}
