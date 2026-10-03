<?php

use App\Http\Controllers\AgendamentoController;
use App\Http\Controllers\BarbeiroController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\ComandaController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FinanceiroLancamentoController;
use App\Http\Controllers\FinanceiroRelatorioController;
use App\Http\Controllers\HorarioTrabalhoController;
use App\Http\Controllers\ProdutoController;
use App\Http\Controllers\ServicoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/user', function (Request $request) {
        // barbeiro vinculado: o frontend usa para saber a agenda do prestador logado
        return $request->user()->load('barbeiro');
    });

    Route::apiResource('clientes', ClienteController::class);
    Route::apiResource('servicos', ServicoController::class);
    Route::apiResource('produtos', ProdutoController::class);
    Route::apiResource('barbeiros', BarbeiroController::class);
    Route::apiResource('barbeiros.horarios-trabalho', HorarioTrabalhoController::class)
        ->shallow()
        ->parameters(['horarios-trabalho' => 'horario_trabalho']);

    Route::apiResource('agendamentos', AgendamentoController::class);

    Route::apiResource('comandas', ComandaController::class)->only(['index', 'store', 'show']);
    Route::post('comandas/{comanda}/itens', [ComandaController::class, 'addItem']);
    Route::delete('comandas/{comanda}/itens/{item}', [ComandaController::class, 'removeItem']);
    Route::post('comandas/{comanda}/fechar', [ComandaController::class, 'fechar']);

    Route::apiResource('financeiro-lancamentos', FinanceiroLancamentoController::class);
    Route::get('financeiro/relatorio', FinanceiroRelatorioController::class);

    Route::get('dashboard', DashboardController::class);
});
