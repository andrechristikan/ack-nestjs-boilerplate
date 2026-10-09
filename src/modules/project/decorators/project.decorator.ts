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
import { hasRequestGuard } from '@common/request/decorators/request.decorator';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestGuardMissingException } from '@common/request/exceptions/request.guard-missing.exception';
import { RequestProtectedGuardMissingException } from '@common/request/exceptions/request.protected-guard-missing.exception';
import { UserGuard } from '@modules/user/guards/user.guard';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';

/**
 * Requires the `projectId` route param to resolve to an existing, non-deleted project in the current workspace; throws at decoration when WorkspaceGuard is not applied below it. A route without a `:projectId` path param answers `RequestContextMissingException`, because the route path is not readable at decoration time.
 * Documents `projectId` and project kits.
 * @public
 */
export function ProjectProtected(): MethodDecorator {
    const decorators = applyDecorators(
        UseGuards(ProjectGuard),
        ApiParam({
            name: 'projectId',
            required: true,
            type: 'string',
            description: 'Project identifier',
        }),
        DocProjectErrorResponses.notFound
    );

    return (target, propertyKey, descriptor): void => {
        if (!hasRequestGuard(descriptor, WorkspaceGuard)) {
            throw new RequestProtectedGuardMissingException(
                'ProjectProtected',
                WorkspaceGuard.name
            );
        }

        decorators(target, propertyKey, descriptor);
    };
}

/**
 * Reads the current project, or one of its fields, that `ProjectGuard` stored. Throws `RequestGuardMissingException` when the project is absent and `RequestContextMissingException` when the requested field is null.
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
            throw new RequestGuardMissingException(ProjectStoreKey);
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
 * it; throws at decoration when ProjectGuard is not applied below it, and also UserGuard without
 * `roles` or WorkspaceMemberGuard with `roles`. Pass `roles` to instead require the caller's
 * project membership role to be one of them, which a workspace owner satisfies without holding a
 * `ProjectMember` row at all; omit `roles` to demand a `ProjectMember` row of the caller with no
 * bypass.
 * @public
 */
export function ProjectMemberProtected(
    ...roles: EnumProjectMemberRole[]
): MethodDecorator {
    const decorators =
        roles.length === 0
            ? applyDecorators(
                  UseGuards(ProjectMemberGuard),
                  DocProjectMemberErrorResponses.notFound,
                  DocProjectMemberErrorResponses.forbidden
              )
            : applyDecorators(
                  UseGuards(ProjectRoleGuard),
                  SetMetadata(ProjectRoleMetaKey, roles),
                  DocProjectRoleErrorResponses.notFound,
                  DocProjectRoleErrorResponses.forbidden
              );
    const siblingGuard = roles.length === 0 ? UserGuard : WorkspaceMemberGuard;

    return (target, propertyKey, descriptor): void => {
        if (!hasRequestGuard(descriptor, ProjectGuard)) {
            throw new RequestProtectedGuardMissingException(
                'ProjectMemberProtected',
                ProjectGuard.name
            );
        }

        if (!hasRequestGuard(descriptor, siblingGuard)) {
            throw new RequestProtectedGuardMissingException(
                'ProjectMemberProtected',
                siblingGuard.name
            );
        }

        decorators(target, propertyKey, descriptor);
    };
}

/**
 * Reads the caller's project member row, or one of its fields, that the role-less `@ProjectMemberProtected()` stored. Valid only on a route using that role-less form: a role-gated route stores no row, and the read throws `RequestGuardMissingException`; a requested field that is null throws `RequestContextMissingException`.
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
            throw new RequestGuardMissingException(ProjectMemberStoreKey);
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
