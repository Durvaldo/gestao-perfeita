<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::firstOrCreate(['email' => 'superadmin@agenda.com'], [
            'name' => 'Super Admin',
            'password' => 'senha123',
            'tipo' => 'super_admin',
            'tenant_id' => null,
        ]);

        $this->call([
            PlanoSeeder::class,
            TenantSeeder::class,
            CadastroSeeder::class,
        ]);
    }
}
