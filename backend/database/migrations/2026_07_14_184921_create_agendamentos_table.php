<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('agendamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('cliente_id')->constrained('clientes');
            $table->foreignId('barbeiro_id')->constrained('barbeiros');
            $table->timestamp('data_hora_inicio');
            $table->timestamp('data_hora_fim');
            $table->enum('status', ['pendente', 'confirmado', 'concluido', 'cancelado'])->default('pendente');
            $table->foreignId('criado_por_user_id')->constrained('users');
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->index(['barbeiro_id', 'data_hora_inicio']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agendamentos');
    }
};
