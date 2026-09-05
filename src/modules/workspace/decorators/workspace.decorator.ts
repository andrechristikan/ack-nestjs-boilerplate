import {
    EnumWorkspaceMemberRole,
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client';
import {
    WorkspaceMemberStoreKey,
    WorkspaceRoleMetaKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';
import { WorkspaceRoleGuard } from '@modules/workspace/guards/workspace.role.guard';
import {
    ExecutionContext,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';

/** Requires `x-workspace-id` to resolve to an existing, non-deleted workspace. Place directly above `@UserProtected()`. */
export function WorkspaceProtected(): MethodDecorator {
    return applyDecorators(UseGuards(WorkspaceGuard));
}

/** Extracts the current workspace that `WorkspaceGuard` stored in the request context. */
export const WorkspaceCurrent = createParamDecorator(
    (_: unknown, _ctx: ExecutionContext): Workspace | undefined => {
        return (
            ClsServiceManager.getClsService().get<Workspace>(
                WorkspaceStoreKey
            ) ?? undefined
        );
    }
);

/**
 * Requires the caller to be a member of the workspace resolved by `@WorkspaceProtected()`. Stack
 * above it. Pass `roles` to additionally require the caller's workspace membership role to be one
 * of them; omit `roles` to only require membership.
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

/** Extracts the current workspace member row that `WorkspaceMemberGuard` stored in the request context. */
export const WorkspaceMemberCurrent = createParamDecorator(
    (_: unknown, _ctx: ExecutionContext): WorkspaceMember | undefined => {
        return (
            ClsServiceManager.getClsService().get<WorkspaceMember>(
                WorkspaceMemberStoreKey
            ) ?? undefined
        );
    }
);
