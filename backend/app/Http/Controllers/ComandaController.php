<?php

namespace App\Http\Controllers;

use App\Http\Requests\ComandaFecharRequest;
use App\Http\Requests\ComandaItemRequest;
use App\Http\Requests\ComandaRequest;
use App\Models\Agendamento;
use App\Models\Comanda;
use App\Models\ComandaItem;
use App\Models\FinanceiroLancamento;
use App\Models\Produto;
use App\Models\Servico;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ComandaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $this->authorize('viewAny', Comanda::class);

        $query = Comanda::with(['cliente', 'barbeiro.user', 'itens.servico', 'itens.produto'])->latest();

        if (auth()->user()->tipo === 'prestador_de_servico') {
            $query->whereHas('barbeiro', fn ($q) => $q->where('user_id', auth()->id()));
        }

        return $query->paginate();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(ComandaRequest $request)
    {
        $comanda = DB::transaction(function () use ($request) {
            $agendamento = $request->validated('agendamento_id')
                ? Agendamento::with('servicos')->find($request->validated('agendamento_id'))
                : null;

            $comanda = Comanda::create([
                'agendamento_id' => $agendamento?->id,
                'cliente_id' => $agendamento?->cliente_id ?? $request->validated('cliente_id'),
                'barbeiro_id' => $agendamento?->barbeiro_id ?? $request->validated('barbeiro_id'),
            ]);

            if ($agendamento) {
                foreach ($agendamento->servicos as $servico) {
                    $comanda->itens()->create([
                        'tipo' => 'servico',
                        'servico_id' => $servico->id,
                        'quantidade' => 1,
                        'preco_unitario' => $servico->pivot->preco_no_momento,
                        'preco_total' => $servico->pivot->preco_no_momento,
                    ]);
                }

                $this->recalcularValorTotal($comanda);
            }

            return $comanda;
        });

        return $comanda->load(['cliente', 'barbeiro.user', 'itens.servico', 'itens.produto']);
    }

    /**
     * Display the specified resource.
     */
    public function show(Comanda $comanda)
    {
        $this->authorize('view', $comanda);

        return $comanda->load(['cliente', 'barbeiro.user', 'itens.servico', 'itens.produto']);
    }

    /**
     * Add an item (serviço or produto) to an open comanda.
     */
    public function addItem(ComandaItemRequest $request, Comanda $comanda)
    {
        if ($comanda->status !== 'aberta') {
            throw ValidationException::withMessages(['comanda' => 'Esta comanda já foi fechada.']);
        }

        $quantidade = $request->validated('quantidade') ?? 1;

        $item = DB::transaction(function () use ($request, $comanda, $quantidade) {
            if ($request->validated('tipo') === 'produto') {
                $produto = Produto::find($request->validated('produto_id'));
                $precoUnitario = $produto->preco;

                if ($produto->estoque_qtd !== null) {
                    $produto->decrement('estoque_qtd', $quantidade);
                }
            } else {
                $precoUnitario = Servico::find($request->validated('servico_id'))->preco;
            }

            $item = $comanda->itens()->create([
                'tipo' => $request->validated('tipo'),
                'servico_id' => $request->validated('servico_id'),
                'produto_id' => $request->validated('produto_id'),
                'quantidade' => $quantidade,
                'preco_unitario' => $precoUnitario,
                'preco_total' => $precoUnitario * $quantidade,
            ]);

            $this->recalcularValorTotal($comanda);

            return $item;
        });

        return $item->load(['servico', 'produto']);
    }

    /**
     * Remove an item from an open comanda.
     */
    public function removeItem(Comanda $comanda, ComandaItem $item)
    {
        $this->authorize('update', $comanda);

        if ($comanda->status !== 'aberta') {
            throw ValidationException::withMessages(['comanda' => 'Esta comanda já foi fechada.']);
        }

        if ($item->comanda_id !== $comanda->id) {
            abort(404);
        }

        DB::transaction(function () use ($item, $comanda) {
            if ($item->tipo === 'produto' && $item->produto && $item->produto->estoque_qtd !== null) {
                $item->produto->increment('estoque_qtd', $item->quantidade);
            }

            $item->delete();
            $this->recalcularValorTotal($comanda);
        });

        return response()->noContent();
    }

    /**
     * Close the comanda: set the payment method, freeze the total, and post it to the financeiro.
     */
    public function fechar(ComandaFecharRequest $request, Comanda $comanda)
    {
        if ($comanda->status !== 'aberta') {
            throw ValidationException::withMessages(['comanda' => 'Esta comanda já foi fechada.']);
        }

        if ($comanda->itens()->doesntExist()) {
            throw ValidationException::withMessages(['itens' => 'Adicione ao menos um item antes de fechar a comanda.']);
        }

        DB::transaction(function () use ($request, $comanda) {
            $this->recalcularValorTotal($comanda);

            $comanda->update([
                'forma_pagamento' => $request->validated('forma_pagamento'),
                'status' => 'paga',
            ]);

            FinanceiroLancamento::create([
                'tipo' => 'receita',
                'categoria' => 'venda',
                'descricao' => "Comanda #{$comanda->id}",
                'valor' => $comanda->valor_total,
                'data' => now()->toDateString(),
            ]);

            $comanda->agendamento?->update(['status' => 'concluido']);
        });

        return $comanda->fresh(['cliente', 'barbeiro.user', 'itens.servico', 'itens.produto']);
    }

    private function recalcularValorTotal(Comanda $comanda): void
    {
        $comanda->update(['valor_total' => $comanda->itens()->sum('preco_total')]);
    }
}
