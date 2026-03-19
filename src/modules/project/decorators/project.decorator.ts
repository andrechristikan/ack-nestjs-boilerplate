import {
    ProjectRoleRequiredMetaKey,
} from '@modules/project/constants/project.constant';
import { IRequestAppWithProject } from '@modules/project/interfaces/request.project.interface';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectRoleGuard } from '@modules/project/guards/project.role.guard';
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
 * Requires the caller to have one of the specified project member roles.
 *
 * Applies the full guard chain:
 * `TenantGuard → TenantMemberGuard → ProjectGuard → ProjectMemberGuard → ProjectRoleGuard`
 *
 * Tenant owners and admins bypass the project role check and are always granted access.
 *
 * @param requiredRoles - One or more project member roles that are allowed to access this endpoint
 *
 * @example
 * \@ProjectRoleProtected(EnumProjectMemberRole.admin)
 * \@ProjectRoleProtected(EnumProjectMemberRole.admin, EnumProjectMemberRole.member)
 */
export function ProjectRoleProtected(
    ...requiredRoles: EnumProjectMemberRole[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(TenantGuard, TenantMemberGuard, ProjectGuard, ProjectMemberGuard, ProjectRoleGuard),
        SetMetadata(ProjectRoleRequiredMetaKey, requiredRoles)
    );
}

/**
 * Injects the current project member resolved by `ProjectMemberGuard`.
 *
 * Returns `undefined` when the caller is a tenant owner or admin who bypassed
 * explicit project membership (they retain full access via their tenant role).
 */
export const ProjectMemberCurrent = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): IProjectMember | undefined => {
        const { __projectMember } = ctx
            .switchToHttp()
            .getRequest<IRequestAppWithProject>();
        return __projectMember;
    }
);
