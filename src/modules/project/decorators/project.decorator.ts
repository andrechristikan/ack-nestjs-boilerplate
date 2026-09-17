import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import type { Project, ProjectMember } from '@generated/prisma-client/client';
import {
    ProjectMemberStoreKey,
    ProjectRoleMetaKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectRoleGuard } from '@modules/project/guards/project.role.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
    RequestStore,
    RequestStoreNullable,
} from '@common/request/decorators/request.decorator';

/**
 * Requires the `projectId` route param to resolve to an existing, non-deleted project in the current workspace.
 * @public
 */
export function ProjectProtected(): MethodDecorator {
    return applyDecorators(UseGuards(ProjectGuard));
}

/**
 * Reads the current project, or one of its fields, that `ProjectGuard` stored.
 * @public
 */
export function ProjectCurrent<K extends Extract<keyof Project, string>>(
    field?: K
): ParameterDecorator {
    return RequestStore(ProjectStoreKey, field);
}

/**
 * Requires the caller to be a member of the project resolved by `@ProjectProtected()`. Stack above
 * it. Pass `roles` to instead require the caller's project membership role to be one of them, which
 * a workspace owner satisfies without holding a `ProjectMember` row at all; omit `roles` to demand a
 * `ProjectMember` row of the caller with no bypass.
 * @public
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

/**
 * Reads the caller's project member row, or one of its fields, stored by the role-less `@ProjectMemberProtected()`; null on every route that passes roles, because `ProjectRoleGuard` stores no member row.
 * @public
 */
export function ProjectMemberCurrent<
    K extends Extract<keyof ProjectMember, string>,
>(field?: K): ParameterDecorator {
    return RequestStoreNullable(ProjectMemberStoreKey, field);
}
