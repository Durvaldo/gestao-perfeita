<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Comanda;
use App\Models\ComandaItem;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $this->authorize('viewAny', Comanda::class);

        return response()->json([
            'produtos_mais_vendidos' => $this->itensMaisVendidos('produto'),
            'servicos_mais_vendidos' => $this->itensMaisVendidos('servico'),
            'ranking_barbeiros' => $this->rankingBarbeiros(),
            'clientes_mais_frequentes' => $this->clientesMaisFrequentes(),
            'proximos_aniversarios' => $this->proximosAniversarios(),
        ]);
    }

    private function itensMaisVendidos(string $tipo): array
    {
        $coluna = "{$tipo}_id";

        return ComandaItem::query()
            ->select("$coluna as id")
            ->selectRaw('sum(quantidade) as quantidade_total')
            ->where('tipo', $tipo)
            ->whereHas('comanda', fn ($q) => $q->where('status', 'paga'))
            ->groupBy($coluna)
            ->orderByDesc('quantidade_total')
            ->limit(5)
            ->get()
            ->map(function ($linha) use ($tipo) {
                $item = $tipo === 'produto' ? \App\Models\Produto::find($linha->id) : \App\Models\Servico::find($linha->id);

                return [
                    'id' => $linha->id,
                    'nome' => $item?->nome,
                    'quantidade_total' => (int) $linha->quantidade_total,
                ];
            })
            ->values()
            ->all();
    }

    private function rankingBarbeiros(): array
    {
        return Comanda::query()
            ->select('barbeiro_id')
            ->selectRaw('sum(valor_total) as faturamento_total')
            ->where('status', 'paga')
            ->groupBy('barbeiro_id')
            ->orderByDesc('faturamento_total')
            ->with('barbeiro.user')
            ->get()
            ->map(fn ($linha) => [
                'barbeiro_id' => $linha->barbeiro_id,
                'nome' => $linha->barbeiro->user->name,
                'faturamento_total' => round($linha->faturamento_total, 2),
            ])
            ->values()
            ->all();
    }

    private function clientesMaisFrequentes(): array
    {
        return Comanda::query()
            ->select('cliente_id')
            ->selectRaw('count(*) as total_atendimentos')
            ->where('status', 'paga')
            ->groupBy('cliente_id')
            ->orderByDesc('total_atendimentos')
            ->limit(5)
            ->with('cliente')
            ->get()
            ->map(fn ($linha) => [
                'cliente_id' => $linha->cliente_id,
                'nome' => $linha->cliente->nome,
                'total_atendimentos' => (int) $linha->total_atendimentos,
            ])
            ->values()
            ->all();
    }

    private function proximosAniversarios(): array
    {
        $hoje = now()->startOfDay();

        return Cliente::query()
            ->whereNotNull('data_nascimento')
            ->get()
            ->map(function (Cliente $cliente) use ($hoje) {
                $proximo = $cliente->data_nascimento->copy()->year($hoje->year);

                if ($proximo->lt($hoje)) {
                    $proximo = $proximo->addYear();
                }

                return [
                    'cliente_id' => $cliente->id,
                    'nome' => $cliente->nome,
                    'data_nascimento' => $cliente->data_nascimento->toDateString(),
                    'dias_ate_aniversario' => $hoje->diffInDays($proximo),
                ];
            })
            ->sortBy('dias_ate_aniversario')
            ->take(5)
            ->values()
            ->all();
    }
}
