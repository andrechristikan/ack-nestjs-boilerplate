import type { Project } from '@generated/prisma-client/client';
import {
    DocPolicyErrorResponses,
    PolicyAbilityScopeMetaKey,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import {
    EnumPolicyAbilityScope,
    EnumPolicyProjectSubject,
} from '@modules/policy/enums/policy.enum';
import { PlatformAbilityGuard } from '@modules/policy/guards/policy.platform.ability.guard';
import { ProjectAbilityGuard } from '@modules/policy/guards/policy.project.ability.guard';
import { WorkspaceAbilityGuard } from '@modules/policy/guards/policy.workspace.ability.guard';
import type { IPolicyRequired } from '@modules/policy/interfaces/policy.interface';
import {
    DocProjectErrorResponses,
    DocProjectMemberErrorResponses,
    ProjectMemberRequiredMetaKey,
    ProjectMemberStoreKey,
    ProjectMemberTargetStoreKey,
    ProjectStoreKey,
    ProjectTargetStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectPolicyGuard } from '@modules/project/guards/project.policy.guard';
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

const ProjectPolicyDocBySubject: Partial<
    Record<EnumPolicyProjectSubject, MethodDecorator>
> = {
    [EnumPolicyProjectSubject.ProjectMember]:
        DocProjectMemberErrorResponses.notFound,
};

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
 * policy-gated route that a workspace role must reach without a row (project delete): a caller
 * with no row passes through and no member is stored.
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
 * Requires the caller to hold the given policies, judged with the platform, workspace, and project
 * abilities composed. `Project` is judged as the record `@ProjectProtected()` stored;
 * `ProjectMember` as the `:projectMemberId` record when the route carries it, by type otherwise
 * (assign). Chains the platform, workspace and project ability guards, then
 * `ProjectPolicyGuard`. Sits above `@ProjectMemberProtected(...)` and `@ProjectProtected()`.
 * @public
 */
export function ProjectPolicyProtected(
    ...requiredPolicies: IPolicyRequired<EnumPolicyProjectSubject>[]
): MethodDecorator {
    const docs = requiredPolicies.flatMap(
        ({ subject }) => ProjectPolicyDocBySubject[subject] ?? []
    );

    return applyDecorators(
        UseGuards(
            PlatformAbilityGuard,
            WorkspaceAbilityGuard,
            ProjectAbilityGuard,
            ProjectPolicyGuard
        ),
        SetMetadata(PolicyRequiredMetaKey, requiredPolicies),
        SetMetadata(PolicyAbilityScopeMetaKey, EnumPolicyAbilityScope.project),
        DocPolicyErrorResponses.forbidden,
        DocPolicyErrorResponses.predefinedNotFound,
        ...docs
    );
}

/**
 * Reads the project record, or one of its fields, that `PlatformPolicyGuard` authorized for the route (an admin route's `:projectId` project, soft-deleted included); throws when either is absent.
 * @public
 */
export const ProjectTargetCurrent = createParamDecorator<
    Extract<keyof Project, string> | undefined,
    Project | NonNullable<Project[Extract<keyof Project, string>]>
>(
    (
        field: Extract<keyof Project, string> | undefined
    ): Project | NonNullable<Project[Extract<keyof Project, string>]> => {
        const target = ClsServiceManager.getClsService().get<
            Project | undefined
        >(ProjectTargetStoreKey);
        if (target === undefined || target === null) {
            throw new RequestContextMissingException(ProjectTargetStoreKey);
        }

        if (field === undefined || field === null) {
            return target;
        }

        const value = target[field];
        if (value === undefined || value === null) {
            throw new RequestContextMissingException(
                `${ProjectTargetStoreKey}.${field}`
            );
        }

        return value;
    }
);

/**
 * Reads the project member record, or one of its fields, that `ProjectPolicyGuard` authorized for the route; throws when either is absent.
 * @public
 */
export const ProjectMemberTargetCurrent = createParamDecorator<
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
        const target = ClsServiceManager.getClsService().get<
            IProjectMemberWithRole | undefined
        >(ProjectMemberTargetStoreKey);
        if (target === undefined || target === null) {
            throw new RequestContextMissingException(
                ProjectMemberTargetStoreKey
            );
        }

        if (field === undefined || field === null) {
            return target;
        }

        const value = target[field];
        if (value === undefined || value === null) {
            throw new RequestContextMissingException(
                `${ProjectMemberTargetStoreKey}.${field}`
            );
        }

        return value;
    }
);
