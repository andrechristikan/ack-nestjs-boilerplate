import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import {
    WorkspaceCursorAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
    WorkspaceInviteDefaultAvailableOrderBy,
    WorkspaceInviteDefaultAvailableSearch,
    WorkspaceJoinRequestDefaultAvailableOrderBy,
    WorkspaceMemberDefaultAvailableOrderBy,
} from '@modules/workspace/constants/workspace.list.constant';
import {
    WorkspaceInviteDocQueryList,
    WorkspaceJoinRequestDocQueryList,
    WorkspaceMemberDocQueryList,
} from '@modules/workspace/constants/workspace.doc.constant';
import { WorkspaceInviteResponseSchema } from '@modules/workspace/dtos/response/workspace.invite.response.dto';
import type { WorkspaceInviteResponseDto } from '@modules/workspace/dtos/response/workspace.invite.response.dto';
import { WorkspaceJoinRequestResponseSchema } from '@modules/workspace/dtos/response/workspace.join-request.response.dto';
import type { WorkspaceJoinRequestResponseDto } from '@modules/workspace/dtos/response/workspace.join-request.response.dto';
import { WorkspaceMemberResponseSchema } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import type { WorkspaceMemberResponseDto } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import { WorkspaceResponseSchema } from '@modules/workspace/dtos/response/workspace.response.dto';
import type { WorkspaceResponseDto } from '@modules/workspace/dtos/response/workspace.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function WorkspaceUserListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list workspaces the caller is a member of' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, termPolicy: true, featureFlag: true }),
        DocResponsePagination<WorkspaceResponseDto>('workspace.list', {
            schema: WorkspaceResponseSchema,
            type: EnumPaginationType.cursor,
            availableSearch: WorkspaceDefaultAvailableSearch,
            availableOrderBy: WorkspaceCursorAvailableOrderBy,
        })
    );
}

export function WorkspaceUserCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'create a new workspace; caller becomes owner' }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, termPolicy: true, featureFlag: true }),
        DocResponse<WorkspaceResponseDto>('workspace.create', {
            schema: WorkspaceResponseSchema,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function WorkspaceUserGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get the current workspace (`x-workspace-id`)' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            featureFlag: true,
        }),
        DocResponse<WorkspaceResponseDto>('workspace.get', {
            schema: WorkspaceResponseSchema,
        })
    );
}

export function WorkspaceUserUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update the current workspace name/description' }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponse<WorkspaceResponseDto>('workspace.update', {
            schema: WorkspaceResponseSchema,
        })
    );
}

export function WorkspaceUserUpdateIsPublicDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'update the current workspace public visibility; a public workspace is discoverable and accepts join requests',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponse<WorkspaceResponseDto>('workspace.updateIsPublic', {
            schema: WorkspaceResponseSchema,
        })
    );
}

export function WorkspaceUserUpdateSlugDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update the current workspace slug' }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponse<WorkspaceResponseDto>('workspace.updateSlug', {
            schema: WorkspaceResponseSchema,
        })
    );
}

export function WorkspaceUserSwitchDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'switch active workspace; persists lastWorkspaceId, client must then send the new x-workspace-id header',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, termPolicy: true, featureFlag: true }),
        DocResponse('workspace.switch')
    );
}

export function WorkspaceUserTransferOwnershipDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'transfer workspace ownership to another member' }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponse('workspace.transferOwnership')
    );
}

export function WorkspaceUserLeaveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'leave the current workspace' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            featureFlag: true,
        }),
        DocResponse('workspace.leave')
    );
}

export function WorkspaceUserSoftDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'soft-delete the current workspace' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponse('workspace.softDelete')
    );
}

export function WorkspaceMemberUserListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list members of the current workspace' }),
        DocRequest({ queries: WorkspaceMemberDocQueryList }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            featureFlag: true,
        }),
        DocResponsePagination<WorkspaceMemberResponseDto>(
            'workspace.member.list',
            {
                schema: WorkspaceMemberResponseSchema,
                type: EnumPaginationType.cursor,
                availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
            }
        )
    );
}

export function WorkspaceMemberUserUpdateRoleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update a member role in the current workspace' }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponse('workspace.member.updateRole')
    );
}

export function WorkspaceMemberUserRemoveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'remove a member from the current workspace' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponse('workspace.member.remove')
    );
}

export function WorkspaceInviteUserListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list invites for the current workspace' }),
        DocRequest({ queries: WorkspaceInviteDocQueryList }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponsePagination<WorkspaceInviteResponseDto>(
            'workspace.invite.list',
            {
                schema: WorkspaceInviteResponseSchema,
                type: EnumPaginationType.cursor,
                availableSearch: WorkspaceInviteDefaultAvailableSearch,
                availableOrderBy: WorkspaceInviteDefaultAvailableOrderBy,
            }
        )
    );
}

export function WorkspaceInviteUserCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'invite a member to the current workspace by email; token is hashed at rest',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponse<WorkspaceInviteResponseDto>('workspace.invite.create', {
            schema: WorkspaceInviteResponseSchema,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function WorkspaceInviteUserResendDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'rotate the token and expiry of a pending invite and resend it; the old link stops working',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponse<WorkspaceInviteResponseDto>('workspace.invite.resend', {
            schema: WorkspaceInviteResponseSchema,
        })
    );
}

export function WorkspaceInviteUserRevokeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'revoke a pending invite for the current workspace' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponse('workspace.invite.revoke')
    );
}

export function WorkspaceInviteUserClaimDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'claim a workspace invite as the already-authenticated caller; joins the invited workspace (and project, if any)',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, termPolicy: true, featureFlag: true }),
        DocResponse('workspace.invite.claim')
    );
}

export function WorkspaceJoinRequestUserCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'request to join a public workspace the caller is not yet a member of',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, termPolicy: true, featureFlag: true }),
        DocResponse<WorkspaceJoinRequestResponseDto>(
            'workspace.joinRequest.create',
            {
                schema: WorkspaceJoinRequestResponseSchema,
                httpStatus: HttpStatus.CREATED,
            }
        )
    );
}

export function WorkspaceJoinRequestUserListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list join requests for the current workspace' }),
        DocRequest({ queries: WorkspaceJoinRequestDocQueryList }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponsePagination<WorkspaceJoinRequestResponseDto>(
            'workspace.joinRequest.list',
            {
                schema: WorkspaceJoinRequestResponseSchema,
                type: EnumPaginationType.cursor,
                availableOrderBy: WorkspaceJoinRequestDefaultAvailableOrderBy,
            }
        )
    );
}

export function WorkspaceJoinRequestUserAcceptDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'accept a pending join request; creates the requester as a member',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponse('workspace.joinRequest.accept')
    );
}

export function WorkspaceJoinRequestUserRejectDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'reject a pending join request with a reason code' }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponse('workspace.joinRequest.reject')
    );
}
