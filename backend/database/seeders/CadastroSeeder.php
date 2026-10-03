<?php

namespace Database\Seeders;

use App\Models\Barbeiro;
use App\Models\Cliente;
use App\Models\Produto;
use App\Models\Servico;
use App\Models\Tenant;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CadastroSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Tenant::all()->each(function (Tenant $tenant) {
            $barbeiros = Barbeiro::factory()
                ->count(2)
                ->create(['tenant_id' => $tenant->id]);

            $servicos = Servico::factory()
                ->count(4)
                ->create(['tenant_id' => $tenant->id]);

            Produto::factory()
                ->count(3)
                ->create(['tenant_id' => $tenant->id]);

            Cliente::factory()
                ->count(6)
                ->create(['tenant_id' => $tenant->id]);

            $barbeiros->each(function (Barbeiro $barbeiro) use ($servicos) {
                $barbeiro->servicos()->attach($servicos->pluck('id'));

                foreach (range(1, 5) as $diaSemana) {
                    $barbeiro->horariosTrabalho()->create([
                        'dia_semana' => $diaSemana,
                        'hora_inicio' => '09:00:00',
                        'hora_fim' => '18:00:00',
                    ]);
                }
            });
        });
    }
}
