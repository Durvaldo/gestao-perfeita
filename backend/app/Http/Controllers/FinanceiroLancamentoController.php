<?php

namespace App\Http\Controllers;

use App\Http\Requests\FinanceiroLancamentoRequest;
use App\Models\FinanceiroLancamento;

class FinanceiroLancamentoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $this->authorize('viewAny', FinanceiroLancamento::class);

        return FinanceiroLancamento::orderByDesc('data')->paginate();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(FinanceiroLancamentoRequest $request)
    {
        return FinanceiroLancamento::create($request->validated());
    }

    /**
     * Display the specified resource.
     */
    public function show(FinanceiroLancamento $financeiroLancamento)
    {
        $this->authorize('view', $financeiroLancamento);

        return $financeiroLancamento;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(FinanceiroLancamentoRequest $request, FinanceiroLancamento $financeiroLancamento)
    {
        $financeiroLancamento->update($request->validated());

        return $financeiroLancamento;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FinanceiroLancamento $financeiroLancamento)
    {
        $this->authorize('delete', $financeiroLancamento);

        $financeiroLancamento->delete();

        return response()->noContent();
    }
}
