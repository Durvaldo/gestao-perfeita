<?php

namespace App\Tenancy;

use RuntimeException;

class TenantContextMissingException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct(
            'Nenhum tenant resolvido para esta requisição. Modelos com BelongsToTenant exigem '.
            'um tenant atual (via middleware ResolveTenant) ou uma chamada explícita a '.
            'CurrentTenant::set(), ou o uso de Model::withoutGlobalScope(TenantScope::class) '.
            'quando a query for intencionalmente cross-tenant (ex: super_admin, seeders).'
        );
    }
}
