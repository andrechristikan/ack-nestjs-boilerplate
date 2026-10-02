import type { Workspace } from '@generated/prisma-client/client';
import {
    DocPolicyErrorResponses,
    PolicyAbilityScopeMetaKey,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import {
    EnumPolicyAbilityScope,
    EnumPolicyWorkspaceSubject,
} from '@modules/policy/enums/policy.enum';
import { PlatformAbilityGuard } from '@modules/policy/guards/policy.platform.ability.guard';
import { WorkspaceAbilityGuard } from '@modules/policy/guards/policy.workspace.ability.guard';
import type { IPolicyRequired } from '@modules/policy/interfaces/policy.interface';
import {
    DocWorkspaceErrorResponses,
    WorkspaceMemberStoreKey,
    WorkspaceMemberTargetStoreKey,
    WorkspaceStoreKey,
    WorkspaceTargetStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';
import { WorkspacePolicyGuard } from '@modules/workspace/guards/workspace.policy.guard';
import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';

const WorkspacePolicyDocBySubject: Partial<
    Record<EnumPolicyWorkspaceSubject, MethodDecorator>
> = {
    [EnumPolicyWorkspaceSubject.Workspace]: DocWorkspaceErrorResponses.notFound,
    [EnumPolicyWorkspaceSubject.WorkspaceMember]:
        DocWorkspaceErrorResponses.memberNotFound,
};

/**
 * Requires `x-workspace-id` to resolve to an existing, non-deleted workspace. Place directly above `@UserProtected()`.
 * @public
 */
export function WorkspaceProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(WorkspaceGuard),
        DocWorkspaceErrorResponses.notFound,
        DocWorkspaceErrorResponses.forbidden
    );
}

/**
 * Reads the current workspace, or one of its fields, that `WorkspaceGuard` stored; throws when either is absent.
 * @public
 */
export const WorkspaceCurrent = createParamDecorator<
    Extract<keyof Workspace, string> | undefined,
    Workspace | NonNullable<Workspace[Extract<keyof Workspace, string>]>
>(
    (
        field: Extract<keyof Workspace, string> | undefined
    ): Workspace | NonNullable<Workspace[Extract<keyof Workspace, string>]> => {
        const workspace = ClsServiceManager.getClsService().get<
            Workspace | undefined
        >(WorkspaceStoreKey);
        if (workspace === undefined || workspace === null) {
            throw new RequestContextMissingException(WorkspaceStoreKey);
        }

        if (field === undefined || field === null) {
            return workspace;
        }

        const value = workspace[field];
        if (value === undefined || value === null) {
            throw new RequestContextMissingException(
                `${WorkspaceStoreKey}.${field}`
            );
        }

        return value;
    }
);

/**
 * Requires the caller to be a member of the workspace resolved by `@WorkspaceProtected()`. Stack
 * above it. The guard stores the membership and builds no ability.
 * @public
 */
export function WorkspaceMemberProtected(): MethodDecorator {
    return applyDecorators(UseGuards(WorkspaceMemberGuard));
}

/**
 * Reads the caller's workspace member row with its role, or one of its fields, that `WorkspaceMemberGuard` stored; throws when either is absent.
 * @public
 */
export const WorkspaceMemberCurrent = createParamDecorator<
    Extract<keyof IWorkspaceMemberWithRole, string> | undefined,
    | IWorkspaceMemberWithRole
    | NonNullable<
          IWorkspaceMemberWithRole[Extract<
              keyof IWorkspaceMemberWithRole,
              string
          >]
      >
>(
    (
        field: Extract<keyof IWorkspaceMemberWithRole, string> | undefined
    ):
        | IWorkspaceMemberWithRole
        | NonNullable<
              IWorkspaceMemberWithRole[Extract<
                  keyof IWorkspaceMemberWithRole,
                  string
              >]
          > => {
        const workspaceMember = ClsServiceManager.getClsService().get<
            IWorkspaceMemberWithRole | undefined
        >(WorkspaceMemberStoreKey);
        if (workspaceMember === undefined || workspaceMember === null) {
            throw new RequestContextMissingException(WorkspaceMemberStoreKey);
        }

        if (field === undefined || field === null) {
            return workspaceMember;
        }

        const value = workspaceMember[field];
        if (value === undefined || value === null) {
            throw new RequestContextMissingException(
                `${WorkspaceMemberStoreKey}.${field}`
            );
        }

        return value;
    }
);

/**
 * Requires the caller to hold the given policies, judged with the platform and workspace abilities
 * composed. `Workspace` is judged as the workspace `WorkspaceGuard` stored; `WorkspaceMember` as
 * the `:workspaceMemberId` record when the route carries it; every other subject, and a route
 * with no param, by type. Chains `PlatformAbilityGuard`, `WorkspaceAbilityGuard`, then
 * `WorkspacePolicyGuard`. Sits above `@WorkspaceMemberProtected()`.
 * @public
 */
export function WorkspacePolicyProtected(
    ...requiredPolicies: IPolicyRequired<EnumPolicyWorkspaceSubject>[]
): MethodDecorator {
    const docs = requiredPolicies.flatMap(
        ({ subject }) => WorkspacePolicyDocBySubject[subject] ?? []
    );

    return applyDecorators(
        UseGuards(
            PlatformAbilityGuard,
            WorkspaceAbilityGuard,
            WorkspacePolicyGuard
        ),
        SetMetadata(PolicyRequiredMetaKey, requiredPolicies),
        SetMetadata(
            PolicyAbilityScopeMetaKey,
            EnumPolicyAbilityScope.workspace
        ),
        DocPolicyErrorResponses.forbidden,
        DocPolicyErrorResponses.predefinedNotFound,
        ...docs
    );
}

/**
 * Reads the workspace record, or one of its fields, that `WorkspacePolicyGuard` or `PlatformPolicyGuard` authorized for the route (an admin route's `:workspaceId` workspace, soft-deleted included); throws when either is absent.
 * @public
 */
export const WorkspaceTargetCurrent = createParamDecorator<
    Extract<keyof Workspace, string> | undefined,
    Workspace | NonNullable<Workspace[Extract<keyof Workspace, string>]>
>(
    (
        field: Extract<keyof Workspace, string> | undefined
    ): Workspace | NonNullable<Workspace[Extract<keyof Workspace, string>]> => {
        const target = ClsServiceManager.getClsService().get<
            Workspace | undefined
        >(WorkspaceTargetStoreKey);
        if (target === undefined || target === null) {
            throw new RequestContextMissingException(WorkspaceTargetStoreKey);
        }

        if (field === undefined || field === null) {
            return target;
        }

        const value = target[field];
        if (value === undefined || value === null) {
            throw new RequestContextMissingException(
                `${WorkspaceTargetStoreKey}.${field}`
            );
        }

        return value;
    }
);

/**
 * Reads the workspace member record, or one of its fields, that `WorkspacePolicyGuard` authorized for the route; throws when either is absent.
 * @public
 */
export const WorkspaceMemberTargetCurrent = createParamDecorator<
    Extract<keyof IWorkspaceMemberWithRole, string> | undefined,
    | IWorkspaceMemberWithRole
    | NonNullable<
          IWorkspaceMemberWithRole[Extract<
              keyof IWorkspaceMemberWithRole,
              string
          >]
      >
>(
    (
        field: Extract<keyof IWorkspaceMemberWithRole, string> | undefined
    ):
        | IWorkspaceMemberWithRole
        | NonNullable<
              IWorkspaceMemberWithRole[Extract<
                  keyof IWorkspaceMemberWithRole,
                  string
              >]
          > => {
        const target = ClsServiceManager.getClsService().get<
            IWorkspaceMemberWithRole | undefined
        >(WorkspaceMemberTargetStoreKey);
        if (target === undefined || target === null) {
            throw new RequestContextMissingException(
                WorkspaceMemberTargetStoreKey
            );
        }

        if (field === undefined || field === null) {
            return target;
        }

        const value = target[field];
        if (value === undefined || value === null) {
            throw new RequestContextMissingException(
                `${WorkspaceMemberTargetStoreKey}.${field}`
            );
        }

        return value;
    }
);
