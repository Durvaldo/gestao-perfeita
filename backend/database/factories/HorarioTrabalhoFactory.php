<?php

namespace Database\Factories;

use App\Models\Barbeiro;
use App\Models\HorarioTrabalho;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HorarioTrabalho>
 */
class HorarioTrabalhoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'barbeiro_id' => Barbeiro::factory(),
            'dia_semana' => fake()->numberBetween(1, 5),
            'hora_inicio' => '09:00:00',
            'hora_fim' => '18:00:00',
        ];
    }
}
