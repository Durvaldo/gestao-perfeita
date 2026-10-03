<?php

namespace Database\Factories;

use App\Models\Produto;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Produto>
 */
class ProdutoFactory extends Factory
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
            'nome' => fake()->randomElement(['Pomada modeladora', 'Óleo para barba', 'Shampoo', 'Cera capilar', 'Balm pós-barba']),
            'descricao' => fake()->optional()->sentence(),
            'preco' => fake()->randomFloat(2, 15, 90),
            'estoque_qtd' => fake()->numberBetween(0, 50),
            'ativo' => true,
        ];
    }
}
