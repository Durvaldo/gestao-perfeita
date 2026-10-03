<?php

namespace Tests\Feature\Cadastro;

use App\Models\Barbeiro;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BarbeiroApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_a_barbeiro_with_its_own_user_account(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);

        $response = $this->actingAs($admin)->postJson('/api/barbeiros', [
            'name' => 'João Barbeiro',
            'email' => 'joao@barbearia-teste.com',
            'password' => 'senha1234',
            'comissao_percentual_padrao' => 30,
        ])->assertCreated();

        $barbeiro = Barbeiro::first();
        $this->assertSame('João Barbeiro', $barbeiro->user->name);
        $this->assertSame('prestador_de_servico', $barbeiro->user->tipo);
        $this->assertSame($tenant->id, $barbeiro->user->tenant_id);
        $this->assertSame($tenant->id, $barbeiro->tenant_id);
    }

    public function test_admin_can_update_and_delete_a_barbeiro(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($admin)
            ->putJson("/api/barbeiros/{$barbeiro->id}", ['comissao_percentual_padrao' => 45, 'ativo' => false])
            ->assertOk()
            ->assertJsonFragment(['ativo' => false]);

        $this->actingAs($admin)->deleteJson("/api/barbeiros/{$barbeiro->id}")->assertNoContent();
        $this->assertSame(0, Barbeiro::count());
    }

    public function test_prestador_cannot_create_or_manage_barbeiros(): void
    {
        $tenant = Tenant::factory()->create();
        $prestador = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'prestador_de_servico']);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($prestador)->postJson('/api/barbeiros', [
            'name' => 'Outro',
            'email' => 'outro@teste.com',
            'password' => 'senha1234',
            'comissao_percentual_padrao' => 20,
        ])->assertForbidden();

        $this->actingAs($prestador)
            ->putJson("/api/barbeiros/{$barbeiro->id}", ['comissao_percentual_padrao' => 45])
            ->assertForbidden();
    }

    public function test_barbeiros_are_isolated_per_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->create(['tenant_id' => $tenantA->id, 'tipo' => 'admin']);
        $barbeiroB = Barbeiro::factory()->create(['tenant_id' => $tenantB->id]);

        $this->actingAs($adminA)->getJson("/api/barbeiros/{$barbeiroB->id}")->assertNotFound();
    }
}
