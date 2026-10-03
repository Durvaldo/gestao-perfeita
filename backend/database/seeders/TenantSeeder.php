<?php

namespace Database\Seeders;

use App\Models\Plano;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TenantSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $basico = Plano::where('nome', 'Básico')->firstOrFail();
        $premium = Plano::where('nome', 'Premium')->firstOrFail();

        $barbeariaCentro = Tenant::firstOrCreate(['slug' => 'barbearia-centro'], [
            'plano_id' => $basico->id,
            'nome' => 'Barbearia Centro',
            'telefone' => '(11) 90000-0001',
            'endereco' => 'Rua Principal, 100 - Centro',
            'status' => 'ativo',
        ]);

        $barbeariaZonaSul = Tenant::firstOrCreate(['slug' => 'barbearia-zona-sul'], [
            'plano_id' => $premium->id,
            'nome' => 'Barbearia Zona Sul',
            'telefone' => '(11) 90000-0002',
            'endereco' => 'Av. das Palmeiras, 500 - Zona Sul',
            'status' => 'trial',
            'trial_ends_at' => now()->addDays(14),
        ]);

        User::firstOrCreate(['email' => 'admin@barbearia-centro.com'], [
            'name' => 'Admin Barbearia Centro',
            'password' => 'senha123',
            'tipo' => 'admin',
            'tenant_id' => $barbeariaCentro->id,
        ]);

        User::firstOrCreate(['email' => 'admin@barbearia-zona-sul.com'], [
            'name' => 'Admin Barbearia Zona Sul',
            'password' => 'senha123',
            'tipo' => 'admin',
            'tenant_id' => $barbeariaZonaSul->id,
        ]);
    }
}
