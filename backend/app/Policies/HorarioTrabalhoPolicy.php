<?php

namespace App\Policies;

use App\Models\Barbeiro;
use App\Models\HorarioTrabalho;
use App\Models\User;

class HorarioTrabalhoPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function view(User $user, HorarioTrabalho $horarioTrabalho): bool
    {
        return in_array($user->tipo, ['admin', 'prestador_de_servico']);
    }

    public function create(User $user, Barbeiro $barbeiro): bool
    {
        return $user->tipo === 'admin'
            || ($user->tipo === 'prestador_de_servico' && $barbeiro->user_id === $user->id);
    }

    public function update(User $user, HorarioTrabalho $horarioTrabalho): bool
    {
        return $user->tipo === 'admin'
            || ($user->tipo === 'prestador_de_servico' && $horarioTrabalho->barbeiro->user_id === $user->id);
    }

    public function delete(User $user, HorarioTrabalho $horarioTrabalho): bool
    {
        return $this->update($user, $horarioTrabalho);
    }
}
