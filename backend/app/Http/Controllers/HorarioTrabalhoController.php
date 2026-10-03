<?php

namespace App\Http\Controllers;

use App\Http\Requests\HorarioTrabalhoRequest;
use App\Models\Barbeiro;
use App\Models\HorarioTrabalho;

class HorarioTrabalhoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Barbeiro $barbeiro)
    {
        $this->authorize('viewAny', HorarioTrabalho::class);

        return $barbeiro->horariosTrabalho()->orderBy('dia_semana')->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(HorarioTrabalhoRequest $request, Barbeiro $barbeiro)
    {
        return $barbeiro->horariosTrabalho()->create($request->validated());
    }

    /**
     * Display the specified resource.
     */
    public function show(HorarioTrabalho $horarioTrabalho)
    {
        $this->authorize('view', $horarioTrabalho);

        return $horarioTrabalho;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(HorarioTrabalhoRequest $request, HorarioTrabalho $horarioTrabalho)
    {
        $horarioTrabalho->update($request->validated());

        return $horarioTrabalho;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(HorarioTrabalho $horarioTrabalho)
    {
        $this->authorize('delete', $horarioTrabalho);

        $horarioTrabalho->delete();

        return response()->noContent();
    }
}
