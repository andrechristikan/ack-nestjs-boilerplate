import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import {
    DocWorkspaceErrorResponses,
    DocWorkspaceRoleErrorResponses,
    WorkspaceMemberStoreKey,
    WorkspaceRoleMetaKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';
import { WorkspaceRoleGuard } from '@modules/workspace/guards/workspace.role.guard';
import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { WorkspaceGuardMissingException } from '@modules/workspace/exceptions/workspace.guard-missing.exception';
import { WorkspaceMemberGuardMissingException } from '@modules/workspace/exceptions/workspace.member-guard-missing.exception';
import { DocUserErrorResponses } from '@modules/user/constants/user.constant';

/**
 * Requires `x-workspace-id` to resolve to an existing, non-deleted workspace. Place directly above `@UserProtected()`.
 * @public
 */
export function WorkspaceProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(WorkspaceGuard),
        DocWorkspaceErrorResponses.badRequest,
        DocWorkspaceErrorResponses.notFound,
        DocWorkspaceErrorResponses.forbidden
    );
}

/**
 * Reads the current workspace, or one of its fields, that `WorkspaceGuard` stored. Throws `WorkspaceGuardMissingException` when the workspace is absent and `RequestContextMissingException` when the requested field is null.
 * @public
 */
export const WorkspaceCurrent = createParamDecorator<
    Extract<keyof Workspace, string> | undefined,
    Workspace | NonNullable<Workspace[Extract<keyof Workspace, string>]>
>(
    (
        field: Extract<keyof Workspace, string> | undefined
    ): Workspace | NonNullable<Workspace[Extract<keyof Workspace, string>]> => {
        const workspace =
            ClsServiceManager.getClsService().get<Workspace | null>(
                WorkspaceStoreKey
            ) ?? null;
        if (workspace === null) {
            throw new WorkspaceGuardMissingException();
        }

        const fieldKey = field ?? null;
        if (fieldKey === null) {
            return workspace;
        }

        const value = workspace[fieldKey] ?? null;
        if (value === null) {
            throw new RequestContextMissingException(
                `${WorkspaceStoreKey}.${field}`
            );
        }

        return value;
    }
);

/**
 * Requires the caller to be a member of the workspace resolved by `@WorkspaceProtected()`. Stack
 * above it. Pass `roles` to additionally require the caller's workspace membership role to be one of them; omit
 * `roles` to only require membership.
 * @public
 */
export function WorkspaceMemberProtected(
    ...roles: EnumWorkspaceMemberRole[]
): MethodDecorator {
    if (roles.length === 0) {
        return applyDecorators(
            UseGuards(WorkspaceMemberGuard),
            DocUserErrorResponses.guardMissing,
            DocWorkspaceErrorResponses.guardMissing
        );
    }

    return applyDecorators(
        UseGuards(WorkspaceMemberGuard, WorkspaceRoleGuard),
        SetMetadata(WorkspaceRoleMetaKey, roles),
        DocUserErrorResponses.guardMissing,
        DocWorkspaceErrorResponses.guardMissing,
        DocWorkspaceErrorResponses.memberGuardMissing,
        DocWorkspaceRoleErrorResponses.forbidden
    );
}

/**
 * Reads the caller's workspace member row, or one of its fields, that `WorkspaceMemberGuard` stored. Throws `WorkspaceMemberGuardMissingException` when the member is absent and `RequestContextMissingException` when the requested field is null.
 * @public
 */
export const WorkspaceMemberCurrent = createParamDecorator<
    Extract<keyof WorkspaceMember, string> | undefined,
    | WorkspaceMember
    | NonNullable<WorkspaceMember[Extract<keyof WorkspaceMember, string>]>
>(
    (
        field: Extract<keyof WorkspaceMember, string> | undefined
    ):
        | WorkspaceMember
        | NonNullable<
              WorkspaceMember[Extract<keyof WorkspaceMember, string>]
          > => {
        const workspaceMember =
            ClsServiceManager.getClsService().get<WorkspaceMember | null>(
                WorkspaceMemberStoreKey
            ) ?? null;
        if (workspaceMember === null) {
            throw new WorkspaceMemberGuardMissingException();
        }

        const fieldKey = field ?? null;
        if (fieldKey === null) {
            return workspaceMember;
        }

        const value = workspaceMember[fieldKey] ?? null;
        if (value === null) {
            throw new RequestContextMissingException(
                `${WorkspaceMemberStoreKey}.${field}`
            );
        }

        return value;
    }
);
