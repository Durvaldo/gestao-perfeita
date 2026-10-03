<?php

namespace App\Policies;

use App\Models\Comanda;
use App\Models\User;

class ComandaPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function view(User $user, Comanda $comanda): bool
    {
        return $user->tipo === 'admin'
            || ($user->tipo === 'prestador_de_servico' && $comanda->barbeiro->user_id === $user->id);
    }

    public function create(User $user): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function update(User $user, Comanda $comanda): bool
    {
        return $this->view($user, $comanda);
    }
}
