import {
    EnumProjectMemberRole,
    Project,
    ProjectMember,
} from '@generated/prisma-client';
import {
    ProjectMemberStoreKey,
    ProjectRoleMetaKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectRoleGuard } from '@modules/project/guards/project.role.guard';
import {
    ExecutionContext,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';

/** Requires the `projectId` route param to resolve to an existing, non-deleted project in the current workspace. */
export function ProjectProtected(): MethodDecorator {
    return applyDecorators(UseGuards(ProjectGuard));
}

/** Extracts the current project that `ProjectGuard` stored in the request context. */
export const ProjectCurrent = createParamDecorator(
    (_: unknown, _ctx: ExecutionContext): Project | undefined => {
        return (
            ClsServiceManager.getClsService().get<Project>(ProjectStoreKey) ??
            undefined
        );
    }
);

/**
 * Requires the caller to be a member of the project resolved by `@ProjectProtected()`. Stack above
 * it. Pass `roles` to instead require the caller's project membership role to be one of them, which
 * a workspace owner satisfies without holding a `ProjectMember` row at all; omit `roles` to demand a
 * `ProjectMember` row of the caller with no bypass.
 */
export function ProjectMemberProtected(
    ...roles: EnumProjectMemberRole[]
): MethodDecorator {
    if (roles.length === 0) {
        return applyDecorators(UseGuards(ProjectMemberGuard));
    }

    return applyDecorators(
        UseGuards(ProjectRoleGuard),
        SetMetadata(ProjectRoleMetaKey, roles)
    );
}

/** Extracts the current project member row that `ProjectMemberGuard` stored in the request context. */
export const ProjectMemberCurrent = createParamDecorator(
    (_: unknown, _ctx: ExecutionContext): ProjectMember | undefined => {
        return (
            ClsServiceManager.getClsService().get<ProjectMember>(
                ProjectMemberStoreKey
            ) ?? undefined
        );
    }
);
