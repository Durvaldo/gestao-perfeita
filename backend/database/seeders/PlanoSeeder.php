<?php

namespace Database\Seeders;

use App\Models\Plano;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PlanoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Plano::firstOrCreate(['nome' => 'Básico'], [
            'descricao' => 'Plano de entrada, com limite de barbeiros e clientes.',
            'preco_mensal' => 49.90,
            'limite_barbeiros' => 2,
            'limite_clientes' => 100,
            'ativo' => true,
        ]);

        Plano::firstOrCreate(['nome' => 'Premium'], [
            'descricao' => 'Plano sem limites de barbeiros ou clientes.',
            'preco_mensal' => 129.90,
            'limite_barbeiros' => null,
            'limite_clientes' => null,
            'ativo' => true,
        ]);
    }
}
