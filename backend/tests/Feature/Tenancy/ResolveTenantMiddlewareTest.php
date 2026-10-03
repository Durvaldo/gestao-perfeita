<?php

namespace Tests\Feature\Tenancy;

use App\Models\Plano;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\CurrentTenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResolveTenantMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_request_resolves_current_tenant_from_user(): void
    {
        $plano = Plano::create(['nome' => 'Básico', 'preco_mensal' => 10, 'ativo' => true]);
        $tenant = Tenant::create([
            'plano_id' => $plano->id,
            'nome' => 'Barbearia Teste',
            'slug' => 'barbearia-teste',
            'status' => 'ativo',
        ]);
        $user = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);

        $this->actingAs($user)->getJson('/api/user')->assertOk();

        $this->assertTrue(app(CurrentTenant::class)->check());
        $this->assertSame($tenant->id, app(CurrentTenant::class)->id());
    }

    public function test_request_without_authenticated_user_does_not_resolve_a_tenant(): void
    {
        $this->getJson('/api/user')->assertUnauthorized();

        $this->assertFalse(app(CurrentTenant::class)->check());
    }
}
