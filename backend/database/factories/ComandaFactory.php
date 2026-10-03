<?php

namespace Database\Factories;

use App\Models\Barbeiro;
use App\Models\Cliente;
use App\Models\Comanda;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Comanda>
 */
class ComandaFactory extends Factory
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
            'cliente_id' => Cliente::factory(),
            'barbeiro_id' => Barbeiro::factory(),
            'valor_total' => 0,
            'status' => 'aberta',
        ];
    }
}
