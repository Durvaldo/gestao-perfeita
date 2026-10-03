<?php

namespace App\Policies;

use App\Models\Produto;
use App\Models\User;

class ProdutoPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function view(User $user, Produto $produto): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function create(User $user): bool
    {
        return $user->tipo === 'admin';
    }

    public function update(User $user, Produto $produto): bool
    {
        return $user->tipo === 'admin';
    }

    public function delete(User $user, Produto $produto): bool
    {
        return $user->tipo === 'admin';
    }
}
