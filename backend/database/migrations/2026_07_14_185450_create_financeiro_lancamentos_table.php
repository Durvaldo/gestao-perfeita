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
        Schema::create('financeiro_lancamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->enum('tipo', ['receita', 'despesa']);
            $table->string('categoria');
            $table->text('descricao')->nullable();
            $table->decimal('valor', 10, 2);
            $table->date('data');
            $table->timestamps();

            $table->index(['tenant_id', 'data']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('financeiro_lancamentos');
    }
};
