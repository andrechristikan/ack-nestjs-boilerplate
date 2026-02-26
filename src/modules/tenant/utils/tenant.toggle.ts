import { RouterModule as NestJsRouterModule } from '@nestjs/core';
import { DynamicModule, Type } from '@nestjs/common';

export const TENANCY_ENABLED =
    (process.env.TENANCY_ENABLED ?? 'false').toLowerCase() === 'true';

export function whenTenancyEnabled<T>(items: T[]): T[] {
    return TENANCY_ENABLED ? items : [];
}

/**
 * Imports a feature-flagged route sub-module AND registers it with
 * NestJS RouterModule at `path`, in a single spread-able call.
 *
 * Usage: ...withTenancyRoute('/shared', TenantRoutesSharedModule)
 */
export function withTenancyRoute(
    path: string,
    module: Type
): (Type | DynamicModule)[] {
    if (!TENANCY_ENABLED) {return [];}
    return [
        module,
        NestJsRouterModule.register([{ path, module }]),
    ];
}
