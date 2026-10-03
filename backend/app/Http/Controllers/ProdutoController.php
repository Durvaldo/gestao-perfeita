<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProdutoRequest;
use App\Models\Produto;

class ProdutoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $this->authorize('viewAny', Produto::class);

        return Produto::latest()->paginate();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(ProdutoRequest $request)
    {
        return Produto::create($request->validated());
    }

    /**
     * Display the specified resource.
     */
    public function show(Produto $produto)
    {
        $this->authorize('view', $produto);

        return $produto;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(ProdutoRequest $request, Produto $produto)
    {
        $produto->update($request->validated());

        return $produto;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Produto $produto)
    {
        $this->authorize('delete', $produto);

        $produto->delete();

        return response()->noContent();
    }
}
