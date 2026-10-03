<?php

namespace App\Http\Controllers;

use App\Http\Requests\BarbeiroRequest;
use App\Models\Barbeiro;
use App\Models\User;
use App\Tenancy\CurrentTenant;
use Illuminate\Support\Facades\DB;

class BarbeiroController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $this->authorize('viewAny', Barbeiro::class);

        return Barbeiro::with('user:id,name,email,telefone')->latest()->paginate();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(BarbeiroRequest $request, CurrentTenant $currentTenant)
    {
        $barbeiro = DB::transaction(function () use ($request, $currentTenant) {
            $user = User::create([
                'name' => $request->validated('name'),
                'email' => $request->validated('email'),
                'password' => $request->validated('password'),
                'telefone' => $request->validated('telefone'),
                'tipo' => 'prestador_de_servico',
                'tenant_id' => $currentTenant->id(),
            ]);

            return Barbeiro::create([
                'user_id' => $user->id,
                'comissao_percentual_padrao' => $request->validated('comissao_percentual_padrao'),
                'foto_url' => $request->validated('foto_url'),
                'ativo' => $request->boolean('ativo', true),
            ]);
        });

        return $barbeiro->load('user:id,name,email,telefone');
    }

    /**
     * Display the specified resource.
     */
    public function show(Barbeiro $barbeiro)
    {
        $this->authorize('view', $barbeiro);

        return $barbeiro->load('user:id,name,email,telefone');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(BarbeiroRequest $request, Barbeiro $barbeiro)
    {
        $barbeiro->update([
            'comissao_percentual_padrao' => $request->validated('comissao_percentual_padrao'),
            'foto_url' => $request->validated('foto_url'),
            'ativo' => $request->boolean('ativo', true),
        ]);

        return $barbeiro->load('user:id,name,email,telefone');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Barbeiro $barbeiro)
    {
        $this->authorize('delete', $barbeiro);

        $barbeiro->delete();

        return response()->noContent();
    }
}
