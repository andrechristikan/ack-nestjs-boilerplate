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

/**
 * Requires the `projectId` route param to resolve to an existing, non-deleted project in the current workspace.
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
        DocProjectErrorResponses.notFound
    );
}

/**
 * Reads the current project, or one of its fields, that `ProjectGuard` stored; throws when either is absent.
 * @public
 */
export const ProjectCurrent = createParamDecorator<
    Extract<keyof Project, string> | undefined,
    Project | NonNullable<Project[Extract<keyof Project, string>]>
>(
    (
        field: Extract<keyof Project, string> | undefined
    ): Project | NonNullable<Project[Extract<keyof Project, string>]> => {
        const project = ClsServiceManager.getClsService().get<
            Project | undefined
        >(ProjectStoreKey);
        if (project === undefined || project === null) {
            throw new RequestContextMissingException(ProjectStoreKey);
        }

        if (field === undefined || field === null) {
            return project;
        }

        const value = project[field];
        if (value === undefined || value === null) {
            throw new RequestContextMissingException(
                `${ProjectStoreKey}.${field}`
            );
        }

        return value;
    }
);

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
        return applyDecorators(
            UseGuards(ProjectMemberGuard),
            DocProjectMemberErrorResponses.notFound,
            DocProjectMemberErrorResponses.forbidden
        );
    }

    return applyDecorators(
        UseGuards(ProjectRoleGuard),
        SetMetadata(ProjectRoleMetaKey, roles),
        DocProjectRoleErrorResponses.notFound,
        DocProjectRoleErrorResponses.forbidden
    );
}

/**
 * Reads the caller's project member row, or one of its fields, that the role-less `@ProjectMemberProtected()` stored. Valid only on a route using that role-less form: a role-gated route stores no row, and the read throws `RequestContextMissingException`.
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
        const projectMember = ClsServiceManager.getClsService().get<
            ProjectMember | undefined
        >(ProjectMemberStoreKey);
        if (projectMember === undefined || projectMember === null) {
            throw new RequestContextMissingException(ProjectMemberStoreKey);
        }

        if (field === undefined || field === null) {
            return projectMember;
        }

        const value = projectMember[field];
        if (value === undefined || value === null) {
            throw new RequestContextMissingException(
                `${ProjectMemberStoreKey}.${field}`
            );
        }

        return value;
    }
);
