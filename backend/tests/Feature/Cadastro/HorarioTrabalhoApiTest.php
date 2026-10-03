<?php

namespace Tests\Feature\Cadastro;

use App\Models\Barbeiro;
use App\Models\HorarioTrabalho;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HorarioTrabalhoApiTest extends TestCase
{
    use RefreshDatabase;

    private function payload(): array
    {
        return ['dia_semana' => 1, 'hora_inicio' => '09:00', 'hora_fim' => '18:00'];
    }

    public function test_admin_can_manage_any_barbeiros_schedule(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);

        $created = $this->actingAs($admin)
            ->postJson("/api/barbeiros/{$barbeiro->id}/horarios-trabalho", $this->payload())
            ->assertCreated()
            ->json();

        $this->actingAs($admin)
            ->putJson("/api/horarios-trabalho/{$created['id']}", ['dia_semana' => 2, 'hora_inicio' => '10:00', 'hora_fim' => '19:00'])
            ->assertOk();

        $this->actingAs($admin)->deleteJson("/api/horarios-trabalho/{$created['id']}")->assertNoContent();
        $this->assertSame(0, HorarioTrabalho::count());
    }

    public function test_prestador_can_manage_only_their_own_schedule(): void
    {
        $tenant = Tenant::factory()->create();
        $barbeiroProprio = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiroOutro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $prestador = $barbeiroProprio->user;

        $this->actingAs($prestador)
            ->postJson("/api/barbeiros/{$barbeiroProprio->id}/horarios-trabalho", $this->payload())
            ->assertCreated();

        $this->actingAs($prestador)
            ->postJson("/api/barbeiros/{$barbeiroOutro->id}/horarios-trabalho", $this->payload())
            ->assertForbidden();
    }

    public function test_schedules_are_isolated_per_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->create(['tenant_id' => $tenantA->id, 'tipo' => 'admin']);
        $barbeiroB = Barbeiro::factory()->create(['tenant_id' => $tenantB->id]);

        $this->actingAs($adminA)
            ->postJson("/api/barbeiros/{$barbeiroB->id}/horarios-trabalho", $this->payload())
            ->assertNotFound();
    }
}
