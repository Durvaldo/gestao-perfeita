<?php

namespace App\Http\Controllers;

use App\Http\Requests\ServicoRequest;
use App\Models\Servico;

class ServicoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $this->authorize('viewAny', Servico::class);

        return Servico::latest()->paginate();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(ServicoRequest $request)
    {
        return Servico::create($request->validated());
    }

    /**
     * Display the specified resource.
     */
    public function show(Servico $servico)
    {
        $this->authorize('view', $servico);

        return $servico;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(ServicoRequest $request, Servico $servico)
    {
        $servico->update($request->validated());

        return $servico;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Servico $servico)
    {
        $this->authorize('delete', $servico);

        $servico->delete();

        return response()->noContent();
    }
}
