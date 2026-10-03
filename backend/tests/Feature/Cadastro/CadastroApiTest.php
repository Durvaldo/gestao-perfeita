<?php

namespace Tests\Feature\Cadastro;

use App\Models\Cliente;
use App\Models\Produto;
use App\Models\Servico;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CadastroApiTest extends TestCase
{
    use RefreshDatabase;

    private function admin(Tenant $tenant): User
    {
        return User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
    }

    private function prestador(Tenant $tenant): User
    {
        return User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'prestador_de_servico']);
    }

    public static function resourceProvider(): array
    {
        return [
            'clientes' => ['clientes', Cliente::class, ['nome' => 'Fulano', 'telefone' => '11999998888']],
            'servicos' => ['servicos', Servico::class, ['nome' => 'Corte', 'duracao_minutos' => 30, 'preco' => 40]],
            'produtos' => ['produtos', Produto::class, ['nome' => 'Pomada', 'preco' => 30]],
        ];
    }

    #[DataProvider('resourceProvider')]
    public function test_admin_has_full_crud_access(string $uri, string $model, array $payload): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->admin($tenant);

        $created = $this->actingAs($admin)->postJson("/api/$uri", $payload)->assertCreated()->json();

        $this->actingAs($admin)->getJson("/api/$uri")->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($admin)->getJson("/api/$uri/{$created['id']}")->assertOk();

        $this->actingAs($admin)->putJson("/api/$uri/{$created['id']}", $payload)->assertOk();
        $this->actingAs($admin)->deleteJson("/api/$uri/{$created['id']}")->assertNoContent();

        $this->assertSame(0, $model::count());
    }

    #[DataProvider('resourceProvider')]
    public function test_prestador_can_view_but_not_manage(string $uri, string $model, array $payload): void
    {
        $tenant = Tenant::factory()->create();
        $prestador = $this->prestador($tenant);
        $record = $model::create($payload + ['tenant_id' => $tenant->id]);

        $this->actingAs($prestador)->getJson("/api/$uri")->assertOk();
        $this->actingAs($prestador)->getJson("/api/$uri/{$record->id}")->assertOk();

        $this->actingAs($prestador)->postJson("/api/$uri", $payload)->assertForbidden();
        $this->actingAs($prestador)->putJson("/api/$uri/{$record->id}", $payload)->assertForbidden();
        $this->actingAs($prestador)->deleteJson("/api/$uri/{$record->id}")->assertForbidden();
    }

    #[DataProvider('resourceProvider')]
    public function test_records_are_isolated_per_tenant(string $uri, string $model, array $payload): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $adminA = $this->admin($tenantA);
        $recordB = $model::create($payload + ['tenant_id' => $tenantB->id]);

        $this->actingAs($adminA)->getJson("/api/$uri")->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($adminA)->getJson("/api/$uri/{$recordB->id}")->assertNotFound();
    }
}
