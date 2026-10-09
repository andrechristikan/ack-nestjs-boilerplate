import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import type { Project, ProjectMember } from '@generated/prisma-client/client';
import {
    DocProjectErrorResponses,
    DocProjectMemberErrorResponses,
    DocProjectRoleErrorResponses,
    ProjectMemberStoreKey,
    ProjectRoleMetaKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectRoleGuard } from '@modules/project/guards/project.role.guard';
import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { ClsServiceManager } from 'nestjs-cls';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { ProjectGuardMissingException } from '@modules/project/exceptions/project.guard-missing.exception';
import { ProjectMemberGuardMissingException } from '@modules/project/exceptions/project.member-guard-missing.exception';
import { DocUserErrorResponses } from '@modules/user/constants/user.constant';
import { DocWorkspaceErrorResponses } from '@modules/workspace/constants/workspace.constant';

/**
 * Requires the `projectId` route param to resolve to an existing, non-deleted project in the current workspace. A route without a `:projectId` path param answers `RequestContextMissingException`, because the route path is not readable at decoration time.
 * Documents `projectId` and project kits.
 * @public
 */
export function ProjectProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ProjectGuard),
        ApiParam({
            name: 'projectId',
            required: true,
            type: 'string',
            description: 'Project identifier',
        }),
        DocProjectErrorResponses.notFound,
        DocWorkspaceErrorResponses.guardMissing
    );
}

/**
 * Reads the current project, or one of its fields, that `ProjectGuard` stored. Throws `ProjectGuardMissingException` when the project is absent and `RequestContextMissingException` when the requested field is null.
 * @public
 */
export const ProjectCurrent = createParamDecorator<
    Extract<keyof Project, string> | undefined,
    Project | NonNullable<Project[Extract<keyof Project, string>]>
>(
    (
        field: Extract<keyof Project, string> | undefined
    ): Project | NonNullable<Project[Extract<keyof Project, string>]> => {
        const project =
            ClsServiceManager.getClsService().get<Project | null>(
                ProjectStoreKey
            ) ?? null;
        if (project === null) {
            throw new ProjectGuardMissingException();
        }

        const fieldKey = field ?? null;
        if (fieldKey === null) {
            return project;
        }

        const value = project[fieldKey] ?? null;
        if (value === null) {
            throw new RequestContextMissingException(
                `${ProjectStoreKey}.${field}`
            );
        }

        return value;
    }
);

/**
 * Requires the caller to be a member of the project resolved by `@ProjectProtected()`. Stack above
 * it. Pass `roles` to instead require the caller's
 * project membership role to be one of them, which a workspace owner satisfies without holding a
 * `ProjectMember` row at all; omit `roles` to demand a `ProjectMember` row of the caller with no
 * bypass.
 * @public
 */
export function ProjectMemberProtected(
    ...roles: EnumProjectMemberRole[]
): MethodDecorator {
    if (roles.length === 0) {
        return applyDecorators(
            UseGuards(ProjectMemberGuard),
            DocProjectMemberErrorResponses.notFound,
            DocProjectMemberErrorResponses.forbidden,
            DocUserErrorResponses.guardMissing,
            DocProjectErrorResponses.guardMissing
        );
    }

    return applyDecorators(
        UseGuards(ProjectRoleGuard),
        SetMetadata(ProjectRoleMetaKey, roles),
        DocProjectRoleErrorResponses.notFound,
        DocProjectRoleErrorResponses.forbidden,
        DocProjectErrorResponses.guardMissing,
        DocWorkspaceErrorResponses.memberGuardMissing
    );
}

/**
 * Reads the caller's project member row, or one of its fields, that the role-less `@ProjectMemberProtected()` stored. Valid only on a route using that role-less form: a role-gated route stores no row, and the read throws `ProjectMemberGuardMissingException`; a requested field that is null throws `RequestContextMissingException`.
 * @public
 */
export const ProjectMemberCurrent = createParamDecorator<
    Extract<keyof ProjectMember, string> | undefined,
    | ProjectMember
    | NonNullable<ProjectMember[Extract<keyof ProjectMember, string>]>
>(
    (
        field: Extract<keyof ProjectMember, string> | undefined
    ):
        | ProjectMember
        | NonNullable<ProjectMember[Extract<keyof ProjectMember, string>]> => {
        const projectMember =
            ClsServiceManager.getClsService().get<ProjectMember | null>(
                ProjectMemberStoreKey
            ) ?? null;
        if (projectMember === null) {
            throw new ProjectMemberGuardMissingException();
        }

        const fieldKey = field ?? null;
        if (fieldKey === null) {
            return projectMember;
        }

        const value = projectMember[fieldKey] ?? null;
        if (value === null) {
            throw new RequestContextMissingException(
                `${ProjectMemberStoreKey}.${field}`
            );
        }

        return value;
    }
);
