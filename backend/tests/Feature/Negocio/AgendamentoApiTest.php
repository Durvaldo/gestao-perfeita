<?php

namespace Tests\Feature\Negocio;

use App\Models\Agendamento;
use App\Models\Barbeiro;
use App\Models\Cliente;
use App\Models\HorarioTrabalho;
use App\Models\Servico;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgendamentoApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_agendamento_and_end_time_is_derived_from_servicos(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $servico = Servico::factory()->create(['tenant_id' => $tenant->id, 'duracao_minutos' => 45, 'preco' => 60]);
        // 2030-01-10 é quinta-feira (dia_semana = 4)
        HorarioTrabalho::factory()->create(['barbeiro_id' => $barbeiro->id, 'dia_semana' => 4]);

        $response = $this->actingAs($admin)->postJson('/api/agendamentos', [
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiro->id,
            'data_hora_inicio' => '2030-01-10 10:00:00',
            'servico_ids' => [$servico->id],
        ])->assertCreated();

        $response->assertJsonPath('data_hora_fim', '2030-01-10T10:45:00.000000Z');
        $this->assertSame(60.0, (float) Agendamento::first()->servicos->first()->pivot->preco_no_momento);
    }

    public function test_overlapping_agendamento_for_same_barbeiro_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $servico = Servico::factory()->create(['tenant_id' => $tenant->id, 'duracao_minutos' => 60]);
        HorarioTrabalho::factory()->create(['barbeiro_id' => $barbeiro->id, 'dia_semana' => 4]);

        $this->actingAs($admin)->postJson('/api/agendamentos', [
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiro->id,
            'data_hora_inicio' => '2030-01-10 10:00:00',
            'servico_ids' => [$servico->id],
        ])->assertCreated();

        $this->actingAs($admin)->postJson('/api/agendamentos', [
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiro->id,
            'data_hora_inicio' => '2030-01-10 10:30:00',
            'servico_ids' => [$servico->id],
        ])->assertUnprocessable()->assertJsonValidationErrors('barbeiro_id');

        $this->assertSame(1, Agendamento::count());
    }

    public function test_agendamento_ending_after_expediente_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $servico = Servico::factory()->create(['tenant_id' => $tenant->id, 'duracao_minutos' => 40]);
        HorarioTrabalho::factory()->create([
            'barbeiro_id' => $barbeiro->id,
            'dia_semana' => 4,
            'hora_inicio' => '09:00:00',
            'hora_fim' => '18:00:00',
        ]);

        // 17:30 + 40min = 18:10, passa do fim do expediente (18:00)
        $this->actingAs($admin)->postJson('/api/agendamentos', [
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiro->id,
            'data_hora_inicio' => '2030-01-10 17:30:00',
            'servico_ids' => [$servico->id],
        ])->assertUnprocessable()->assertJsonValidationErrors('data_hora_inicio');

        $this->assertSame(0, Agendamento::count());
    }

    public function test_agendamento_on_day_without_expediente_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $servico = Servico::factory()->create(['tenant_id' => $tenant->id, 'duracao_minutos' => 30]);

        $this->actingAs($admin)->postJson('/api/agendamentos', [
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiro->id,
            'data_hora_inicio' => '2030-01-10 10:00:00',
            'servico_ids' => [$servico->id],
        ])->assertUnprocessable()->assertJsonValidationErrors('data_hora_inicio');
    }

    public function test_agendamento_spanning_lunch_gap_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $servico = Servico::factory()->create(['tenant_id' => $tenant->id, 'duracao_minutos' => 30]);
        HorarioTrabalho::factory()->create([
            'barbeiro_id' => $barbeiro->id,
            'dia_semana' => 4,
            'hora_inicio' => '09:00:00',
            'hora_fim' => '12:00:00',
        ]);
        HorarioTrabalho::factory()->create([
            'barbeiro_id' => $barbeiro->id,
            'dia_semana' => 4,
            'hora_inicio' => '13:00:00',
            'hora_fim' => '18:00:00',
        ]);

        // 11:50 + 30min = 12:20, invade o intervalo — não cabe em nenhum período
        $this->actingAs($admin)->postJson('/api/agendamentos', [
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiro->id,
            'data_hora_inicio' => '2030-01-10 11:50:00',
            'servico_ids' => [$servico->id],
        ])->assertUnprocessable()->assertJsonValidationErrors('data_hora_inicio');
    }

    public function test_status_only_update_works_even_when_agendamento_is_outside_current_expediente(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $servico = Servico::factory()->create(['tenant_id' => $tenant->id, 'duracao_minutos' => 30]);

        // Registro legado fora do expediente (sem nenhum horário cadastrado),
        // criado direto no banco — como os que existiam antes desta validação.
        $agendamento = Agendamento::factory()->create([
            'tenant_id' => $tenant->id,
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiro->id,
            'data_hora_inicio' => '2030-01-10 10:00:00',
            'data_hora_fim' => '2030-01-10 10:30:00',
        ]);
        $agendamento->servicos()->attach([$servico->id => ['preco_no_momento' => $servico->preco]]);

        // Mesmo payload, só mudando o status (é o que o frontend envia)
        $this->actingAs($admin)->putJson("/api/agendamentos/{$agendamento->id}", [
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiro->id,
            'data_hora_inicio' => '2030-01-10 10:00:00',
            'servico_ids' => [$servico->id],
            'status' => 'concluido',
        ])->assertOk()->assertJsonPath('status', 'concluido');
    }

    public function test_prestador_only_sees_and_manages_their_own_agendamentos(): void
    {
        $tenant = Tenant::factory()->create();
        $barbeiroProprio = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiroOutro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $prestador = $barbeiroProprio->user;
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $servico = Servico::factory()->create(['tenant_id' => $tenant->id]);

        $proprio = Agendamento::factory()->create([
            'tenant_id' => $tenant->id,
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiroProprio->id,
            'criado_por_user_id' => $prestador->id,
        ]);
        $deOutro = Agendamento::factory()->create([
            'tenant_id' => $tenant->id,
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiroOutro->id,
            'criado_por_user_id' => $barbeiroOutro->user_id,
        ]);

        $this->actingAs($prestador)->getJson('/api/agendamentos')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $proprio->id);

        $this->actingAs($prestador)->getJson("/api/agendamentos/{$deOutro->id}")->assertForbidden();
    }

    public function test_index_with_period_returns_flat_list_of_overlapping_agendamentos(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);

        $base = ['tenant_id' => $tenant->id, 'cliente_id' => $cliente->id, 'barbeiro_id' => $barbeiro->id];

        $dentro = Agendamento::factory()->create($base + [
            'data_hora_inicio' => '2030-01-15 10:00:00',
            'data_hora_fim' => '2030-01-15 10:30:00',
        ]);
        // começa antes do período mas invade ele — deve entrar (filtro por sobreposição)
        $invadindo = Agendamento::factory()->create($base + [
            'data_hora_inicio' => '2030-01-13 23:30:00',
            'data_hora_fim' => '2030-01-14 00:30:00',
        ]);
        Agendamento::factory()->create($base + [
            'data_hora_inicio' => '2030-01-21 10:00:00',
            'data_hora_fim' => '2030-01-21 10:30:00',
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/agendamentos?de=2030-01-14T00:00&ate=2030-01-21T00:00')
            ->assertOk()
            ->assertJsonCount(2);

        $this->assertEqualsCanonicalizing(
            [$dentro->id, $invadindo->id],
            array_column($response->json(), 'id')
        );
    }

    public function test_index_can_filter_by_barbeiro_id(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'admin']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiroA = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiroB = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);

        $deA = Agendamento::factory()->create([
            'tenant_id' => $tenant->id,
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiroA->id,
        ]);
        Agendamento::factory()->create([
            'tenant_id' => $tenant->id,
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiroB->id,
        ]);

        $this->actingAs($admin)->getJson("/api/agendamentos?barbeiro_id={$barbeiroA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $deA->id);
    }

    public function test_prestador_gets_empty_list_when_filtering_by_other_barbeiro(): void
    {
        $tenant = Tenant::factory()->create();
        $barbeiroProprio = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $barbeiroOutro = Barbeiro::factory()->create(['tenant_id' => $tenant->id]);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);

        Agendamento::factory()->create([
            'tenant_id' => $tenant->id,
            'cliente_id' => $cliente->id,
            'barbeiro_id' => $barbeiroOutro->id,
        ]);

        $this->actingAs($barbeiroProprio->user)
            ->getJson("/api/agendamentos?barbeiro_id={$barbeiroOutro->id}")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_agendamentos_are_isolated_per_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->create(['tenant_id' => $tenantA->id, 'tipo' => 'admin']);
        $agendamentoB = Agendamento::factory()->create(['tenant_id' => $tenantB->id]);

        $this->actingAs($adminA)->getJson("/api/agendamentos/{$agendamentoB->id}")->assertNotFound();
    }
}
