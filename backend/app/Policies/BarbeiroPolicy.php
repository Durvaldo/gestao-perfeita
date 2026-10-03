<?php

namespace App\Policies;

use App\Models\Barbeiro;
use App\Models\User;

class BarbeiroPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function view(User $user, Barbeiro $barbeiro): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function create(User $user): bool
    {
        return $user->tipo === 'admin';
    }

    public function update(User $user, Barbeiro $barbeiro): bool
    {
        return $user->tipo === 'admin';
    }

    public function delete(User $user, Barbeiro $barbeiro): bool
    {
        return $user->tipo === 'admin';
    }
}
