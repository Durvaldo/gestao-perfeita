<?php

namespace Database\Factories;

use App\Models\Barbeiro;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Barbeiro>
 */
class BarbeiroFactory extends Factory
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
            'user_id' => fn (array $attributes) => User::factory()->create([
                'tipo' => 'prestador_de_servico',
                'tenant_id' => $attributes['tenant_id'],
            ])->id,
            'comissao_percentual_padrao' => fake()->randomFloat(2, 10, 50),
            'foto_url' => null,
            'ativo' => true,
        ];
    }
}
