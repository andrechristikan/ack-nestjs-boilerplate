import type { Workspace } from '@generated/prisma-client/client';
import {
    DocWorkspaceErrorResponses,
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';
import {
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';

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
 * above it. The guard also merges the caller's workspace role policies into the resolved ability.
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
