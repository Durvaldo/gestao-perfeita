<?php

namespace Tests\Feature\Negocio;

use App\Models\Barbeiro;
use App\Models\Cliente;
use App\Models\Comanda;
use App\Models\FinanceiroLancamento;
use App\Models\Servico;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceiroApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_has_full_crud_and_prestador_is_forbidden(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $prestador = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'prestador_de_servico']);

        $payload = ['tipo' => 'despesa', 'categoria' => 'aluguel', 'valor' => 1200, 'data' => '2030-01-05'];

        $this->actingAs($prestador)->postJson('/api/financeiro-lancamentos', $payload)->assertForbidden();
        $this->actingAs($prestador)->getJson('/api/financeiro-lancamentos')->assertForbidden();

        $created = $this->actingAs($admin)->postJson('/api/financeiro-lancamentos', $payload)
            ->assertCreated()->json();

        $this->actingAs($admin)->putJson("/api/financeiro-lancamentos/{$created['id']}", array_merge($payload, ['valor' => 1300]))
            ->assertOk()->assertJsonPath('valor', '1300.00');

        $this->actingAs($admin)->deleteJson("/api/financeiro-lancamentos/{$created['id']}")->assertNoContent();
        $this->assertSame(0, FinanceiroLancamento::count());
    }

    public function test_relatorio_totals_and_commission_are_computed_correctly(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id, 'comissao_percentual_padrao' => 40]);
        $servico = Servico::factory()->create(['tenant_id' => $tenant->id, 'preco' => 100]);

        FinanceiroLancamento::factory()->create([
            'tenant_id' => $tenant->id, 'tipo' => 'despesa', 'valor' => 200, 'data' => now(),
        ]);

        $comanda = Comanda::factory()->create([
            'tenant_id' => $tenant->id, 'cliente_id' => $cliente->id, 'barbeiro_id' => $barbeiro->id,
        ]);
        $this->actingAs($admin)->postJson("/api/comandas/{$comanda->id}/itens", [
            'tipo' => 'servico', 'servico_id' => $servico->id,
        ])->assertCreated();
        $this->actingAs($admin)->postJson("/api/comandas/{$comanda->id}/fechar", ['forma_pagamento' => 'dinheiro'])
            ->assertOk();

        $response = $this->actingAs($admin)->getJson('/api/financeiro/relatorio')->assertOk();

        $response->assertJsonPath('total_receitas', 100)
            ->assertJsonPath('total_despesas', 200)
            ->assertJsonPath('saldo', -100)
            ->assertJsonPath('comissoes_por_barbeiro.0.comissao', 40);
    }
}
