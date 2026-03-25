import {
    TenantRoleRequiredMetaKey,
} from '@modules/tenant/constants/tenant.constant';
import {
    ITenant,
    ITenantMember,
} from '@modules/tenant/interfaces/tenant.interface';
import { IRequestAppWithTenant } from '@modules/tenant/interfaces/request.tenant.interface';
import { TenantGuard } from '@modules/tenant/guards/tenant.guard';
import { TenantMemberGuard } from '@modules/tenant/guards/tenant.member.guard';
import { TenantRoleGuard } from '@modules/tenant/guards/tenant.role.guard';
import { EnumTenantMemberRole } from '@generated/prisma-client';
import {
    ExecutionContext,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';

/**
 * Requires a valid tenant context for the route.
 * Swagger counterpart: `DocTenantProtected`.
 */
export function TenantProtected(): MethodDecorator {
    return applyDecorators(UseGuards(TenantGuard));
}

/**
 * Requires a valid tenant membership for the route.
 * Swagger counterpart: `DocTenantMemberProtected`.
 */
export function TenantMemberProtected(): MethodDecorator {
    return applyDecorators(UseGuards(TenantGuard, TenantMemberGuard));
}

/**
 * Requires the caller to have one of the specified tenant roles.
 * Swagger counterpart: `DocTenantRoleProtected`.
 *
 * @param requiredRoles - One or more tenant member roles that are allowed to access this endpoint
 *
 * @example
 * @TenantRoleProtected(EnumTenantMemberRole.admin)
 * @TenantRoleProtected(EnumTenantMemberRole.owner, EnumTenantMemberRole.admin)
 */
export function TenantRoleProtected(
    ...requiredRoles: EnumTenantMemberRole[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(TenantGuard, TenantMemberGuard, TenantRoleGuard),
        SetMetadata(TenantRoleRequiredMetaKey, requiredRoles)
    );
}

/**
 * Injects the current tenant resolved by tenant guards.
 */
export const TenantCurrent = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): ITenant | undefined => {
        const { __tenant } = ctx
            .switchToHttp()
            .getRequest<IRequestAppWithTenant>();
        return __tenant;
    }
);

/**
 * Injects the current tenant member resolved by tenant guards.
 */
export const TenantMemberCurrent = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): ITenantMember | undefined => {
        const { __tenantMember } = ctx
            .switchToHttp()
            .getRequest<IRequestAppWithTenant>();
        return __tenantMember;
    }
);
