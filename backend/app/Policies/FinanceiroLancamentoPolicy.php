<?php

namespace App\Policies;

use App\Models\FinanceiroLancamento;
use App\Models\User;

class FinanceiroLancamentoPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->tipo === 'admin';
    }

    public function view(User $user, FinanceiroLancamento $financeiroLancamento): bool
    {
        return $user->tipo === 'admin';
    }

    public function create(User $user): bool
    {
        return $user->tipo === 'admin';
    }

    public function update(User $user, FinanceiroLancamento $financeiroLancamento): bool
    {
        return $user->tipo === 'admin';
    }

    public function delete(User $user, FinanceiroLancamento $financeiroLancamento): bool
    {
        return $user->tipo === 'admin';
    }
}
