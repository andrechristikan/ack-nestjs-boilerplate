import {
    ProjectPermissionRequiredMetaKey,
    ProjectRoleRequiredMetaKey,
} from '@modules/project/constants/project.constant';
import { IRequestAppWithProject } from '@modules/project/interfaces/request.project.interface';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectPermissionGuard } from '@modules/project/guards/project.permission.guard';
import { ProjectRoleGuard } from '@modules/project/guards/project.role.guard';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { TenantGuard } from '@modules/tenant/guards/tenant.guard';
import { TenantMemberGuard } from '@modules/tenant/guards/tenant.member.guard';
import { EnumProjectMemberRole } from '@generated/prisma-client';
import {
    ExecutionContext,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';

/**
 * Requires project-scoped permissions for routes that target a specific project resource.
 * Swagger counterpart: `DocProjectPermissionProtected`.
 */
export function ProjectPermissionProtected(
    ...requiredAbilities: RoleAbilityRequestDto[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(ProjectMemberGuard, ProjectPermissionGuard),
        SetMetadata(ProjectPermissionRequiredMetaKey, requiredAbilities)
    );
}

export function ProjectRoleProtected(
    ...requiredRoles: EnumProjectMemberRole[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(TenantGuard, TenantMemberGuard, ProjectRoleGuard),
        SetMetadata(ProjectRoleRequiredMetaKey, requiredRoles)
    );
}

/**
 * Injects the current project member resolved by project guards.
 */
export const ProjectMemberCurrent = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): IProjectMember | undefined => {
        const { __projectMember } = ctx
            .switchToHttp()
            .getRequest<IRequestAppWithProject>();
        return __projectMember;
    }
);
