import {
    TenantPermissionRequiredMetaKey,
    TenantRoleRequiredMetaKey,
} from '@modules/tenant/constants/tenant.constant';
import {
    ITenant,
    ITenantMember,
} from '@modules/tenant/interfaces/tenant.interface';
import { IRequestAppWithTenant } from '@modules/tenant/interfaces/request.tenant.interface';
import { TenantGuard } from '@modules/tenant/guards/tenant.guard';
import { TenantMemberGuard } from '@modules/tenant/guards/tenant.member.guard';
import { TenantPermissionGuard } from '@modules/tenant/guards/tenant.permission.guard';
import { TenantRoleGuard } from '@modules/tenant/guards/tenant.role.guard';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
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
 */
export function TenantRoleProtected(
    ...requiredRoleNames: string[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(TenantGuard, TenantMemberGuard, TenantRoleGuard),
        SetMetadata(TenantRoleRequiredMetaKey, requiredRoleNames)
    );
}

/**
 * Requires the caller to have the specified tenant abilities.
 * Swagger counterpart: `DocTenantPermissionProtected`.
 */
export function TenantPermissionProtected(
    ...requiredAbilities: RoleAbilityRequestDto[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(TenantGuard, TenantMemberGuard, TenantPermissionGuard),
        SetMetadata(TenantPermissionRequiredMetaKey, requiredAbilities)
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
