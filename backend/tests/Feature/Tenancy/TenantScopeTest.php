<?php

namespace Tests\Feature\Tenancy;

use App\Models\Plano;
use App\Models\Tenant;
use App\Tenancy\BelongsToTenant;
use App\Tenancy\CurrentTenant;
use App\Tenancy\TenantContextMissingException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Exercises the BelongsToTenant/TenantScope mechanism directly, using a throwaway
 * table/model since the first real tenant-scoped domain tables only arrive in Passo 5.
 */
class TenantScopeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('tenant_scope_test_items', function ($table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->string('name');
            $table->timestamps();
        });
    }

    private function makeTenant(string $slug): Tenant
    {
        $plano = Plano::create([
            'nome' => "Plano $slug",
            'preco_mensal' => 10,
            'ativo' => true,
        ]);

        return Tenant::create([
            'plano_id' => $plano->id,
            'nome' => "Tenant $slug",
            'slug' => $slug,
            'status' => 'ativo',
        ]);
    }

    public function test_queries_are_isolated_per_tenant(): void
    {
        $tenantA = $this->makeTenant('tenant-a');
        $tenantB = $this->makeTenant('tenant-b');

        $currentTenant = app(CurrentTenant::class);

        $currentTenant->set($tenantA);
        TenantScopeTestItem::create(['tenant_id' => $tenantA->id, 'name' => 'Item A1']);
        TenantScopeTestItem::create(['tenant_id' => $tenantA->id, 'name' => 'Item A2']);

        $currentTenant->set($tenantB);
        TenantScopeTestItem::create(['tenant_id' => $tenantB->id, 'name' => 'Item B1']);

        $currentTenant->set($tenantA);
        $this->assertSame(2, TenantScopeTestItem::count());
        $this->assertEqualsCanonicalizing(
            ['Item A1', 'Item A2'],
            TenantScopeTestItem::pluck('name')->all(),
        );

        $currentTenant->set($tenantB);
        $this->assertSame(1, TenantScopeTestItem::count());
        $this->assertSame(['Item B1'], TenantScopeTestItem::pluck('name')->all());
    }

    public function test_creating_without_explicit_tenant_id_uses_current_tenant(): void
    {
        $tenantA = $this->makeTenant('tenant-a');

        app(CurrentTenant::class)->set($tenantA);

        $item = TenantScopeTestItem::create(['name' => 'Auto tenant']);

        $this->assertSame($tenantA->id, $item->tenant_id);
    }

    public function test_querying_without_a_resolved_tenant_throws(): void
    {
        $this->makeTenant('tenant-a');

        $this->expectException(TenantContextMissingException::class);

        TenantScopeTestItem::count();
    }
}

class TenantScopeTestItem extends Model
{
    use BelongsToTenant;

    protected $table = 'tenant_scope_test_items';

    protected $guarded = [];
}
