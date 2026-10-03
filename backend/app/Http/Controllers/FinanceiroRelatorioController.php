<?php

namespace App\Http\Controllers;

use App\Models\Comanda;
use App\Models\FinanceiroLancamento;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class FinanceiroRelatorioController extends Controller
{
    /**
     * Totais de receita/despesa/saldo no período, e comissão por barbeiro
     * calculada em tempo real a partir dos itens de serviço das comandas pagas.
     */
    public function __invoke(Request $request)
    {
        $this->authorize('viewAny', FinanceiroLancamento::class);

        $inicio = Carbon::parse($request->query('inicio', now()->startOfMonth()))->startOfDay();
        $fim = Carbon::parse($request->query('fim', now()->endOfMonth()))->endOfDay();

        $lancamentos = FinanceiroLancamento::whereBetween('data', [$inicio, $fim])->get();

        $totalReceitas = $lancamentos->where('tipo', 'receita')->sum('valor');
        $totalDespesas = $lancamentos->where('tipo', 'despesa')->sum('valor');

        $comandas = Comanda::with(['barbeiro.user', 'itens' => fn ($q) => $q->where('tipo', 'servico')->with('servico.barbeiros')])
            ->where('status', 'paga')
            ->whereBetween('updated_at', [$inicio, $fim])
            ->get();

        $comissoesPorBarbeiro = $comandas
            ->groupBy('barbeiro_id')
            ->map(function ($comandasDoBarbeiro) {
                $barbeiro = $comandasDoBarbeiro->first()->barbeiro;

                $comissao = $comandasDoBarbeiro->flatMap->itens->sum(function ($item) use ($barbeiro) {
                    $percentual = $item->servico->barbeiros
                        ->firstWhere('id', $barbeiro->id)
                        ?->pivot
                        ?->comissao_percentual
                        ?? $barbeiro->comissao_percentual_padrao;

                    return $item->preco_total * $percentual / 100;
                });

                return [
                    'barbeiro_id' => $barbeiro->id,
                    'barbeiro_nome' => $barbeiro->user->name,
                    'comissao' => round($comissao, 2),
                ];
            })
            ->values();

        return response()->json([
            'periodo' => ['inicio' => $inicio->toDateString(), 'fim' => $fim->toDateString()],
            'total_receitas' => round($totalReceitas, 2),
            'total_despesas' => round($totalDespesas, 2),
            'saldo' => round($totalReceitas - $totalDespesas, 2),
            'comissoes_por_barbeiro' => $comissoesPorBarbeiro,
        ]);
    }
}
