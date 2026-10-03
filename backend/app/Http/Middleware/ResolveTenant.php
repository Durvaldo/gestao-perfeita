<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Tenancy\CurrentTenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    /**
     * Handle an incoming request.
     *
     * Resolves the tenant for this request, in order of priority:
     * 1. A `{tenant}` route parameter (slug, used by public routes such as the booking page).
     * 2. The tenant of the currently authenticated user.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $currentTenant = app(CurrentTenant::class);

        $routeTenant = $request->route('tenant');

        if ($routeTenant instanceof Tenant) {
            $currentTenant->set($routeTenant);
        } elseif (is_string($routeTenant)) {
            $currentTenant->set(Tenant::where('slug', $routeTenant)->first());
        } elseif ($request->user()?->tenant_id) {
            $currentTenant->set($request->user()->tenant);
        }

        return $next($request);
    }
}
