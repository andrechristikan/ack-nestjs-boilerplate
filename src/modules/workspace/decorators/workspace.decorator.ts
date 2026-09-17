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
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { RequestStore } from '@common/request/decorators/request.decorator';

/**
 * Requires `x-workspace-id` to resolve to an existing, non-deleted workspace. Place directly above `@UserProtected()`.
 * @public
 */
export function WorkspaceProtected(): MethodDecorator {
    return applyDecorators(UseGuards(WorkspaceGuard));
}

/**
 * Reads the current workspace, or one of its fields, that `WorkspaceGuard` stored.
 * @public
 */
export function WorkspaceCurrent<K extends Extract<keyof Workspace, string>>(
    field?: K
): ParameterDecorator {
    return RequestStore(WorkspaceStoreKey, field);
}

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
 * Reads the current workspace member row, or one of its fields, that `WorkspaceMemberGuard` stored.
 * @public
 */
export function WorkspaceMemberCurrent<
    K extends Extract<keyof WorkspaceMember, string>,
>(field?: K): ParameterDecorator {
    return RequestStore(WorkspaceMemberStoreKey, field);
}
