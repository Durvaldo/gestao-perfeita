<?php

namespace Tests\Feature;

use App\Models\Barbeiro;
use App\Models\Cliente;
use App\Models\Comanda;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocalizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_validation_errors_are_in_portuguese_with_friendly_attribute_names(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $comanda = Comanda::factory()->create([
            'tenant_id' => $tenant->id, 'cliente_id' => $cliente->id, 'barbeiro_id' => $barbeiro->id,
        ]);

        $response = $this->actingAs($admin)->postJson("/api/comandas/{$comanda->id}/itens", [
            'tipo' => 'servico',
            'servico_id' => 'nao-e-um-numero',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonPath('errors.servico_id.0', 'O campo serviço deve ser um número inteiro.');
    }

    public function test_unauthenticated_request_returns_portuguese_message(): void
    {
        $this->getJson('/api/user')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Não autenticado.');
    }

    public function test_forbidden_request_returns_portuguese_message(): void
    {
        $tenant = Tenant::factory()->create();
        $prestador = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'prestador_de_servico']);

        $this->actingAs($prestador)->postJson('/api/financeiro-lancamentos', [
            'tipo' => 'despesa', 'categoria' => 'aluguel', 'valor' => 100, 'data' => '2030-01-01',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Esta ação não é autorizada.');
    }

    public function test_not_found_request_returns_portuguese_message(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);

        $this->actingAs($admin)->getJson('/api/agendamentos/999999')
            ->assertNotFound()
            ->assertJsonPath('message', 'Registro não encontrado.');
    }
}
