import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import {
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

/**
 * Requires `x-workspace-id` to resolve to an existing, non-deleted workspace. Place directly above `@UserProtected()`.
 * @public
 */
export function WorkspaceProtected(): MethodDecorator {
    return applyDecorators(UseGuards(WorkspaceGuard));
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
 * above it. Pass `roles` to additionally require the caller's workspace membership role to be one
 * of them; omit `roles` to only require membership.
 * @public
 */
export function WorkspaceMemberProtected(
    ...roles: EnumWorkspaceMemberRole[]
): MethodDecorator {
    if (roles.length === 0) {
        return applyDecorators(UseGuards(WorkspaceMemberGuard));
    }

    return applyDecorators(
        UseGuards(WorkspaceMemberGuard, WorkspaceRoleGuard),
        SetMetadata(WorkspaceRoleMetaKey, roles)
    );
}

/**
 * Reads the caller's workspace member row, or one of its fields, that `WorkspaceMemberGuard` stored; throws when either is absent.
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
        const workspaceMember = ClsServiceManager.getClsService().get<
            WorkspaceMember | undefined
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
