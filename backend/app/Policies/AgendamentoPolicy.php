<?php

namespace App\Policies;

use App\Models\Agendamento;
use App\Models\User;

class AgendamentoPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function view(User $user, Agendamento $agendamento): bool
    {
        return $user->tipo === 'admin'
            || ($user->tipo === 'prestador_de_servico' && $agendamento->barbeiro->user_id === $user->id);
    }

    public function create(User $user): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function update(User $user, Agendamento $agendamento): bool
    {
        return $this->view($user, $agendamento);
    }

    public function delete(User $user, Agendamento $agendamento): bool
    {
        return $user->tipo === 'admin';
    }
}
