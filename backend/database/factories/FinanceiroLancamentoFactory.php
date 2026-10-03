<?php

namespace Database\Factories;

use App\Models\FinanceiroLancamento;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinanceiroLancamento>
 */
class FinanceiroLancamentoFactory extends Factory
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
            'tipo' => fake()->randomElement(['receita', 'despesa']),
            'categoria' => fake()->randomElement(['aluguel', 'produtos', 'manutencao', 'venda']),
            'descricao' => fake()->optional()->sentence(),
            'valor' => fake()->randomFloat(2, 10, 500),
            'data' => fake()->dateTimeBetween('-1 month', 'now'),
        ];
    }
}
