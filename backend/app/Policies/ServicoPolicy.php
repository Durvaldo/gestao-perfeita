<?php

namespace App\Policies;

use App\Models\Servico;
use App\Models\User;

class ServicoPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function view(User $user, Servico $servico): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function create(User $user): bool
    {
        return $user->tipo === 'admin';
    }

    public function update(User $user, Servico $servico): bool
    {
        return $user->tipo === 'admin';
    }

    public function delete(User $user, Servico $servico): bool
    {
        return $user->tipo === 'admin';
    }
}
