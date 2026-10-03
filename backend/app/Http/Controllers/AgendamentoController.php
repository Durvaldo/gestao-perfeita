<?php

namespace App\Http\Controllers;

use App\Http\Requests\AgendamentoRequest;
use App\Models\Agendamento;
use App\Models\Servico;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AgendamentoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Agendamento::class);

        $request->validate([
            'barbeiro_id' => ['sometimes', 'integer'],
            'de' => ['sometimes', 'date'],
            'ate' => ['sometimes', 'date'],
        ]);

        $query = Agendamento::with(['cliente', 'barbeiro.user', 'servicos'])
            ->orderBy('data_hora_inicio');

        if (auth()->user()->tipo === 'prestador_de_servico') {
            $query->whereHas('barbeiro', fn ($q) => $q->where('user_id', auth()->id()));
        }

        // Para o prestador este filtro apenas se soma ao whereHas acima:
        // pedir a agenda de outro barbeiro retorna vazio, nunca vaza dados.
        if ($request->filled('barbeiro_id')) {
            $query->where('barbeiro_id', $request->integer('barbeiro_id'));
        }

        if ($request->filled('de') && $request->filled('ate')) {
            // Sobreposição (inicio < ate AND fim > de) em vez de whereBetween:
            // pega agendamentos que começam antes do período mas invadem ele.
            $query->where('data_hora_inicio', '<', Carbon::parse($request->query('ate')))
                ->where('data_hora_fim', '>', Carbon::parse($request->query('de')));

            return $query->get();
        }

        return $query->paginate();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(AgendamentoRequest $request)
    {
        [$inicio, $fim, $servicos] = $this->resolveHorario($request);

        if (! Agendamento::dentroDoExpediente($request->validated('barbeiro_id'), $inicio, $fim)) {
            throw ValidationException::withMessages([
                'data_hora_inicio' => 'O horário está fora do expediente do barbeiro.',
            ]);
        }

        if (Agendamento::conflita($request->validated('barbeiro_id'), $inicio, $fim)) {
            throw ValidationException::withMessages([
                'barbeiro_id' => 'Este barbeiro já tem um agendamento nesse horário.',
            ]);
        }

        $agendamento = DB::transaction(function () use ($request, $inicio, $fim, $servicos) {
            $agendamento = Agendamento::create([
                'cliente_id' => $request->validated('cliente_id'),
                'barbeiro_id' => $request->validated('barbeiro_id'),
                'data_hora_inicio' => $inicio,
                'data_hora_fim' => $fim,
                'criado_por_user_id' => auth()->id(),
                'observacoes' => $request->validated('observacoes'),
            ]);

            $agendamento->servicos()->attach($servicos->mapWithKeys(fn (Servico $s) => [
                $s->id => ['preco_no_momento' => $s->preco],
            ]));

            return $agendamento;
        });

        return $agendamento->load(['cliente', 'barbeiro.user', 'servicos']);
    }

    /**
     * Display the specified resource.
     */
    public function show(Agendamento $agendamento)
    {
        $this->authorize('view', $agendamento);

        return $agendamento->load(['cliente', 'barbeiro.user', 'servicos']);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(AgendamentoRequest $request, Agendamento $agendamento)
    {
        [$inicio, $fim, $servicos] = $this->resolveHorario($request);

        // Só revalida o expediente se barbeiro/horário mudaram — trocar apenas o
        // status (confirmar/atender/cancelar) precisa funcionar mesmo para
        // agendamentos antigos que ficaram fora do expediente atual.
        $horarioMudou = $agendamento->barbeiro_id !== (int) $request->validated('barbeiro_id')
            || ! $agendamento->data_hora_inicio->equalTo($inicio)
            || ! $agendamento->data_hora_fim->equalTo($fim);

        if ($horarioMudou && ! Agendamento::dentroDoExpediente($request->validated('barbeiro_id'), $inicio, $fim)) {
            throw ValidationException::withMessages([
                'data_hora_inicio' => 'O horário está fora do expediente do barbeiro.',
            ]);
        }

        if (Agendamento::conflita($request->validated('barbeiro_id'), $inicio, $fim, $agendamento->id)) {
            throw ValidationException::withMessages([
                'barbeiro_id' => 'Este barbeiro já tem um agendamento nesse horário.',
            ]);
        }

        DB::transaction(function () use ($request, $agendamento, $inicio, $fim, $servicos) {
            $agendamento->update([
                'cliente_id' => $request->validated('cliente_id'),
                'barbeiro_id' => $request->validated('barbeiro_id'),
                'data_hora_inicio' => $inicio,
                'data_hora_fim' => $fim,
                'observacoes' => $request->validated('observacoes'),
                'status' => $request->validated('status') ?? $agendamento->status,
            ]);

            $agendamento->servicos()->sync($servicos->mapWithKeys(fn (Servico $s) => [
                $s->id => ['preco_no_momento' => $s->preco],
            ]));
        });

        return $agendamento->fresh(['cliente', 'barbeiro.user', 'servicos']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Agendamento $agendamento)
    {
        $this->authorize('delete', $agendamento);

        $agendamento->delete();

        return response()->noContent();
    }

    /**
     * Compute the end time from the selected serviços' total duration, and load them.
     *
     * @return array{0: Carbon, 1: Carbon, 2: \Illuminate\Support\Collection<int, Servico>}
     */
    private function resolveHorario(AgendamentoRequest $request): array
    {
        $servicos = Servico::whereIn('id', $request->validated('servico_ids'))->get();
        $inicio = Carbon::parse($request->validated('data_hora_inicio'));
        $fim = $inicio->copy()->addMinutes((int) $servicos->sum('duracao_minutos'));

        return [$inicio, $fim, $servicos];
    }
}
