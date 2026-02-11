import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ProjectPermissionRequiredMetaKey } from '@modules/project/constants/project.constant';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectPermissionGuard } from '@modules/project/guards/project.permission.guard';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { TenantMemberGuard } from '@modules/tenant/guards/tenant.member.guard';
import {
    ExecutionContext,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';

/**
 * Requires project-scoped permissions for routes that target a specific project resource.
 */
export function ProjectPermissionProtected(
    ...requiredAbilities: RoleAbilityRequestDto[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(TenantMemberGuard, ProjectMemberGuard, ProjectPermissionGuard),
        SetMetadata(ProjectPermissionRequiredMetaKey, requiredAbilities)
    );
}

/**
 * Injects the current project member resolved by project guards.
 */
export const ProjectMemberCurrent = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): IProjectMember | undefined => {
        const { __projectMember } = ctx.switchToHttp().getRequest<IRequestApp>();
        return __projectMember;
    }
);
