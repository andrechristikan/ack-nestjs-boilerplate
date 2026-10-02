import type { Project } from '@generated/prisma-client/client';
import { EnumPolicyProjectSubject } from '@modules/policy/enums/policy.enum';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import type { IPolicyRequired } from '@modules/policy/interfaces/policy.interface';
import {
    DocProjectErrorResponses,
    DocProjectMemberErrorResponses,
    ProjectMemberRequiredMetaKey,
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import type { IProjectMemberWithRole } from '@modules/project/interfaces/project.interface';
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
 * Loads the caller's project membership and stores it with its role. Stack above
 * `@ProjectProtected()` and `@WorkspaceMemberProtected()`. The default is strict: a caller with no
 * `ProjectMember` row is rejected with `memberForbidden`. Pass `{ required: false }` only on a
 * policy-gated route that a workspace-scoped role must reach without a project row (project
 * read, update, slug update, delete, and the member list, assign, role update and remove
 * routes): a caller with no row passes through, no member is stored, and the policy checks decide.
 * @public
 */
export function ProjectMemberProtected(options?: {
    required?: boolean;
}): MethodDecorator {
    const required = options?.required ?? true;
    if (!required) {
        return applyDecorators(
            UseGuards(ProjectMemberGuard),
            SetMetadata(ProjectMemberRequiredMetaKey, false)
        );
    }

    return applyDecorators(
        UseGuards(ProjectMemberGuard),
        SetMetadata(ProjectMemberRequiredMetaKey, true),
        DocProjectMemberErrorResponses.forbidden
    );
}

/**
 * Reads the caller's project member row with its role, or one of its fields, that the strict `@ProjectMemberProtected()` stored. Valid only under the strict form: a `{ required: false }` route may hold no row, and the read then throws `RequestContextMissingException`.
 * @public
 */
export const ProjectMemberCurrent = createParamDecorator<
    Extract<keyof IProjectMemberWithRole, string> | undefined,
    | IProjectMemberWithRole
    | NonNullable<
          IProjectMemberWithRole[Extract<keyof IProjectMemberWithRole, string>]
      >
>(
    (
        field: Extract<keyof IProjectMemberWithRole, string> | undefined
    ):
        | IProjectMemberWithRole
        | NonNullable<
              IProjectMemberWithRole[Extract<
                  keyof IProjectMemberWithRole,
                  string
              >]
          > => {
        const projectMember = ClsServiceManager.getClsService().get<
            IProjectMemberWithRole | undefined
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

/**
 * Requires the caller to hold the given project policy subject/action pairs.
 * Sits above `@ProjectMemberProtected(...)` and `@ProjectProtected()`.
 * @public
 */
export function ProjectPolicyProtected(
    ...requiredPolicies: IPolicyRequired<EnumPolicyProjectSubject>[]
): MethodDecorator {
    return PolicyProtected(...requiredPolicies);
}
