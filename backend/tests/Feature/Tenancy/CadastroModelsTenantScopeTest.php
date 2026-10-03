<?php

namespace Tests\Feature\Tenancy;

use App\Models\Cliente;
use App\Models\Plano;
use App\Models\Servico;
use App\Models\Tenant;
use App\Tenancy\CurrentTenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CadastroModelsTenantScopeTest extends TestCase
{
    use RefreshDatabase;

    private function makeTenant(string $slug): Tenant
    {
        $plano = Plano::create(['nome' => "Plano $slug", 'preco_mensal' => 10, 'ativo' => true]);

        return Tenant::create([
            'plano_id' => $plano->id,
            'nome' => "Tenant $slug",
            'slug' => $slug,
            'status' => 'ativo',
        ]);
    }

    public function test_servicos_and_clientes_are_isolated_per_tenant(): void
    {
        $tenantA = $this->makeTenant('tenant-a');
        $tenantB = $this->makeTenant('tenant-b');

        $currentTenant = app(CurrentTenant::class);

        $currentTenant->set($tenantA);
        Servico::create(['nome' => 'Corte', 'duracao_minutos' => 30, 'preco' => 40]);
        Cliente::create(['nome' => 'Cliente A', 'telefone' => '11999990000']);

        $currentTenant->set($tenantB);
        Servico::create(['nome' => 'Barba', 'duracao_minutos' => 20, 'preco' => 25]);

        $currentTenant->set($tenantA);
        $this->assertSame(['Corte'], Servico::pluck('nome')->all());
        $this->assertSame(1, Cliente::count());

        $currentTenant->set($tenantB);
        $this->assertSame(['Barba'], Servico::pluck('nome')->all());
        $this->assertSame(0, Cliente::count());
    }
}
