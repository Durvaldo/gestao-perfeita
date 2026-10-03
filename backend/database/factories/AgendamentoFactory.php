<?php

namespace Database\Factories;

use App\Models\Agendamento;
use App\Models\Barbeiro;
use App\Models\Cliente;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Agendamento>
 */
class AgendamentoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $inicio = fake()->dateTimeBetween('+1 day', '+2 weeks');
        $fim = (clone $inicio)->modify('+30 minutes');

        return [
            'tenant_id' => Tenant::factory(),
            'cliente_id' => Cliente::factory(),
            'barbeiro_id' => Barbeiro::factory(),
            'data_hora_inicio' => $inicio,
            'data_hora_fim' => $fim,
            'status' => 'pendente',
            'criado_por_user_id' => User::factory(),
            'observacoes' => fake()->optional()->sentence(),
        ];
    }
}
