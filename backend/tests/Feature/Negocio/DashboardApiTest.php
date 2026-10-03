<?php

namespace Tests\Feature\Negocio;

use App\Models\Barbeiro;
use App\Models\Cliente;
use App\Models\Comanda;
use App\Models\Produto;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_aggregates_only_paid_comandas_and_ranks_correctly(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id, 'nome' => 'Cliente Fiel']);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $produto = Produto::factory()->create(['tenant_id' => $tenant->id, 'nome' => 'Pomada', 'preco' => 30, 'estoque_qtd' => 100]);

        // Comanda paga: deve aparecer no dashboard.
        $comandaPaga = Comanda::factory()->create([
            'tenant_id' => $tenant->id, 'cliente_id' => $cliente->id, 'barbeiro_id' => $barbeiro->id,
        ]);
        $this->actingAs($admin)->postJson("/api/comandas/{$comandaPaga->id}/itens", [
            'tipo' => 'produto', 'produto_id' => $produto->id, 'quantidade' => 3,
        ])->assertCreated();
        $this->actingAs($admin)->postJson("/api/comandas/{$comandaPaga->id}/fechar", ['forma_pagamento' => 'pix'])
            ->assertOk();

        // Comanda aberta: NÃO deve entrar nas métricas.
        Comanda::factory()->create([
            'tenant_id' => $tenant->id, 'cliente_id' => $cliente->id, 'barbeiro_id' => $barbeiro->id,
        ]);

        $response = $this->actingAs($admin)->getJson('/api/dashboard')->assertOk();

        $response->assertJsonPath('produtos_mais_vendidos.0.nome', 'Pomada')
            ->assertJsonPath('produtos_mais_vendidos.0.quantidade_total', 3)
            ->assertJsonPath('ranking_barbeiros.0.faturamento_total', 90)
            ->assertJsonPath('clientes_mais_frequentes.0.nome', 'Cliente Fiel')
            ->assertJsonPath('clientes_mais_frequentes.0.total_atendimentos', 1);
    }

    public function test_proximos_aniversarios_orders_by_closest_upcoming_birthday(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);

        $hoje = now();
        Cliente::factory()->create([
            'tenant_id' => $tenant->id, 'nome' => 'Aniversário em 5 dias',
            'data_nascimento' => $hoje->copy()->addDays(5)->subYears(20),
        ]);
        Cliente::factory()->create([
            'tenant_id' => $tenant->id, 'nome' => 'Aniversário em 100 dias',
            'data_nascimento' => $hoje->copy()->addDays(100)->subYears(30),
        ]);

        $response = $this->actingAs($admin)->getJson('/api/dashboard')->assertOk();

        $response->assertJsonPath('proximos_aniversarios.0.nome', 'Aniversário em 5 dias');
    }
}
