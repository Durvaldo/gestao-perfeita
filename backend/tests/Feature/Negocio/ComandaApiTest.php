<?php

namespace Tests\Feature\Negocio;

use App\Models\Agendamento;
use App\Models\Barbeiro;
use App\Models\Cliente;
use App\Models\Comanda;
use App\Models\FinanceiroLancamento;
use App\Models\Produto;
use App\Models\Servico;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComandaApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_comanda_created_from_agendamento_is_prefilled_with_its_servicos(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $servico = Servico::factory()->create(['tenant_id' => $tenant->id, 'preco' => 50]);

        $agendamento = Agendamento::factory()->create([
            'tenant_id' => $tenant->id,
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiro->id,
            'criado_por_user_id' => $admin->id,
        ]);
        $agendamento->servicos()->attach($servico->id, ['preco_no_momento' => 50]);

        $response = $this->actingAs($admin)->postJson('/api/comandas', [
            'agendamento_id' => $agendamento->id,
        ])->assertCreated();

        $response->assertJsonCount(1, 'itens')
            ->assertJsonPath('itens.0.preco_total', '50.00')
            ->assertJsonPath('valor_total', '50.00')
            ->assertJsonPath('cliente_id', $cliente->id)
            ->assertJsonPath('barbeiro_id', $barbeiro->id);
    }

    public function test_avulsa_comanda_accepts_items_decrements_stock_and_can_be_closed(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $produto = Produto::factory()->create(['tenant_id' => $tenant->id, 'preco' => 20, 'estoque_qtd' => 10]);

        $comanda = $this->actingAs($admin)->postJson('/api/comandas', [
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiro->id,
        ])->assertCreated()->json();

        $item = $this->actingAs($admin)
            ->postJson("/api/comandas/{$comanda['id']}/itens", [
                'tipo' => 'produto',
                'produto_id' => $produto->id,
                'quantidade' => 2,
            ])
            ->assertCreated()
            ->json();

        $this->assertSame(8, $produto->fresh()->estoque_qtd);
        $this->assertSame('40.00', (string) $item['preco_total']);

        $this->actingAs($admin)
            ->postJson("/api/comandas/{$comanda['id']}/fechar", ['forma_pagamento' => 'pix'])
            ->assertOk()
            ->assertJsonPath('status', 'paga')
            ->assertJsonPath('valor_total', '40.00');

        $this->assertDatabaseHas('financeiro_lancamentos', [
            'tenant_id' => $tenant->id,
            'tipo' => 'receita',
            'valor' => 40,
        ]);

        $this->actingAs($admin)
            ->postJson("/api/comandas/{$comanda['id']}/itens", ['tipo' => 'produto', 'produto_id' => $produto->id])
            ->assertUnprocessable();
    }

    public function test_removing_item_restores_stock_and_recalculates_total(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $produto = Produto::factory()->create(['tenant_id' => $tenant->id, 'preco' => 15, 'estoque_qtd' => 5]);

        $comanda = Comanda::factory()->create([
            'tenant_id' => $tenant->id,
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiro->id,
        ]);

        $item = $this->actingAs($admin)
            ->postJson("/api/comandas/{$comanda->id}/itens", ['tipo' => 'produto', 'produto_id' => $produto->id])
            ->assertCreated()
            ->json();

        $this->assertSame(4, $produto->fresh()->estoque_qtd);

        $this->actingAs($admin)->deleteJson("/api/comandas/{$comanda->id}/itens/{$item['id']}")->assertNoContent();

        $this->assertSame(5, $produto->fresh()->estoque_qtd);
        $this->assertSame('0.00', (string) $comanda->fresh()->valor_total);
    }

    public function test_prestador_cannot_manage_another_barbeiros_comanda(): void
    {
        $tenant = Tenant::factory()->create();
        $barbeiroProprio = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiroOutro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $prestador = $barbeiroProprio->user;
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);

        $comandaDeOutro = Comanda::factory()->create([
            'tenant_id' => $tenant->id,
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiroOutro->id,
        ]);

        $this->actingAs($prestador)
            ->postJson("/api/comandas/{$comandaDeOutro->id}/itens", ['tipo' => 'produto', 'produto_id' => 1])
            ->assertForbidden();
    }
}
