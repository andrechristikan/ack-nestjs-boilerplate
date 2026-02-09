import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    TenantPermissionRequiredMetaKey,
    TenantRoleRequiredMetaKey,
} from '@modules/tenant/constants/tenant.constant';
import { ITenant, ITenantMember } from '@modules/tenant/interfaces/tenant.interface';
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

export function TenantProtected(): MethodDecorator {
    return applyDecorators(UseGuards(TenantGuard));
}

export function TenantMemberProtected(): MethodDecorator {
    return applyDecorators(UseGuards(TenantMemberGuard));
}

export function TenantRoleProtected(
    ...requiredRoleNames: string[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(TenantMemberGuard, TenantRoleGuard),
        SetMetadata(TenantRoleRequiredMetaKey, requiredRoleNames)
    );
}

export function TenantPermissionProtected(
    ...requiredAbilities: RoleAbilityRequestDto[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(TenantMemberGuard, TenantPermissionGuard),
        SetMetadata(TenantPermissionRequiredMetaKey, requiredAbilities)
    );
}

export const TenantCurrent = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): ITenant | undefined => {
        const { __tenant } = ctx.switchToHttp().getRequest<IRequestApp>();
        return __tenant;
    }
);

export const TenantMemberCurrent = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): ITenantMember | undefined => {
        const { __tenantMember } =
            ctx.switchToHttp().getRequest<IRequestApp>();
        return __tenantMember;
    }
);
