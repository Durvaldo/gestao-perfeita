<?php

namespace App\Policies;

use App\Models\Cliente;
use App\Models\User;

class ClientePolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function view(User $user, Cliente $cliente): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function create(User $user): bool
    {
        return $user->tipo === 'admin';
    }

    public function update(User $user, Cliente $cliente): bool
    {
        return $user->tipo === 'admin';
    }

    public function delete(User $user, Cliente $cliente): bool
    {
        return $user->tipo === 'admin';
    }
}
