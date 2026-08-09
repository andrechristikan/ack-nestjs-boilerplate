import {
    Doc,
    DocAuth,
    DocOneOf,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import {
    WorkspaceInviteDocParamsId,
    WorkspaceInviteDocQueryList,
    WorkspaceJoinRequestDocParamsId,
    WorkspaceJoinRequestDocQueryList,
    WorkspaceMemberDocParamsId,
    WorkspaceMemberDocQueryList,
} from '@modules/workspace/constants/workspace.doc.constant';
import {
    WorkspaceDefaultAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
    WorkspaceInviteDefaultAvailableOrderBy,
    WorkspaceInviteDefaultAvailableSearch,
    WorkspaceJoinRequestDefaultAvailableOrderBy,
    WorkspaceMemberDefaultAvailableOrderBy,
} from '@modules/workspace/constants/workspace.list.constant';
import { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceJoinRequestRejectRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-reject.request.dto';
import { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import { WorkspaceSwitchRequestDto } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { WorkspaceUpdateIsPublicRequestDto } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';
import { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspaceInviteResponseDto } from '@modules/workspace/dtos/response/workspace.invite.response.dto';
import { WorkspaceJoinRequestResponseDto } from '@modules/workspace/dtos/response/workspace.join-request.response.dto';
import { WorkspaceMemberResponseDto } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import { WorkspaceResponseDto } from '@modules/workspace/dtos/response/workspace.response.dto';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { HttpStatus, applyDecorators } from '@nestjs/common';

const NotFoundDoc = DocOneOf(HttpStatus.NOT_FOUND, {
    statusCode: EnumWorkspaceStatusCodeError.notFound,
    messagePath: 'workspace.error.notFound',
});

const MemberForbiddenDoc = DocOneOf(HttpStatus.FORBIDDEN, {
    statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
    messagePath: 'workspace.error.memberForbidden',
});

const RoleForbiddenDoc = DocOneOf(HttpStatus.FORBIDDEN, {
    statusCode: EnumWorkspaceStatusCodeError.roleForbidden,
    messagePath: 'workspace.error.roleForbidden',
});

export function WorkspaceUserListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list workspaces the caller is a member of' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponsePaging<WorkspaceResponseDto>('workspace.list', {
            dto: WorkspaceResponseDto,
            type: EnumPaginationType.offset,
            availableSearch: WorkspaceDefaultAvailableSearch,
            availableOrder: WorkspaceDefaultAvailableOrderBy,
        })
    );
}

export function WorkspaceUserCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'create a new workspace; caller becomes owner' }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: WorkspaceCreateRequestDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.capReached,
            messagePath: 'workspace.error.capReached',
        }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.slugAlreadyExists,
            messagePath: 'workspace.error.slugAlreadyExists',
        }),
        DocResponse<WorkspaceResponseDto>('workspace.create', {
            dto: WorkspaceResponseDto,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function WorkspaceUserGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get the current workspace (`x-workspace-id`)' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        DocResponse<WorkspaceResponseDto>('workspace.get', {
            dto: WorkspaceResponseDto,
        })
    );
}

export function WorkspaceUserUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update the current workspace name/description' }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: WorkspaceUpdateRequestDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocResponse<WorkspaceResponseDto>('workspace.update', {
            dto: WorkspaceResponseDto,
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
            dto: WorkspaceUpdateIsPublicRequestDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocResponse<WorkspaceResponseDto>('workspace.updateIsPublic', {
            dto: WorkspaceResponseDto,
        })
    );
}

export function WorkspaceUserUpdateSlugDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update the current workspace slug' }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: WorkspaceUpdateSlugRequestDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.slugAlreadyExists,
            messagePath: 'workspace.error.slugAlreadyExists',
        }),
        DocResponse<WorkspaceResponseDto>('workspace.updateSlug', {
            dto: WorkspaceResponseDto,
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
            dto: WorkspaceSwitchRequestDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        DocResponse('workspace.switch')
    );
}

export function WorkspaceUserTransferOwnershipDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'transfer workspace ownership to another member' }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: WorkspaceTransferOwnershipRequestDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocOneOf(HttpStatus.NOT_FOUND, {
            statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            messagePath: 'workspace.error.memberNotFound',
        }),
        DocResponse('workspace.transferOwnership')
    );
}

export function WorkspaceUserLeaveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'leave the current workspace' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.lastOwner,
            messagePath: 'workspace.error.lastOwner',
        }),
        DocResponse('workspace.leave')
    );
}

export function WorkspaceUserSoftDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'soft-delete the current workspace' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocResponse('workspace.softDelete')
    );
}

export function WorkspaceMemberUserListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list members of the current workspace' }),
        DocRequest({ queries: WorkspaceMemberDocQueryList }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        DocResponsePaging<WorkspaceMemberResponseDto>('workspace.member.list', {
            dto: WorkspaceMemberResponseDto,
            type: EnumPaginationType.offset,
            availableOrder: WorkspaceMemberDefaultAvailableOrderBy,
        })
    );
}

export function WorkspaceMemberUserUpdateRoleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update a member role in the current workspace' }),
        DocRequest({
            params: WorkspaceMemberDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: WorkspaceMemberUpdateRoleRequestDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocOneOf(HttpStatus.NOT_FOUND, {
            statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            messagePath: 'workspace.error.memberNotFound',
        }),
        DocOneOf(HttpStatus.FORBIDDEN, {
            statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
            messagePath: 'workspace.error.memberPeerForbidden',
        }),
        DocResponse('workspace.member.updateRole')
    );
}

export function WorkspaceMemberUserRemoveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'remove a member from the current workspace' }),
        DocRequest({ params: WorkspaceMemberDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocOneOf(HttpStatus.NOT_FOUND, {
            statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            messagePath: 'workspace.error.memberNotFound',
        }),
        DocOneOf(HttpStatus.FORBIDDEN, {
            statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
            messagePath: 'workspace.error.memberPeerForbidden',
        }),
        DocResponse('workspace.member.remove')
    );
}

export function WorkspaceInviteUserListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list invites for the current workspace' }),
        DocRequest({ queries: WorkspaceInviteDocQueryList }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocResponsePaging<WorkspaceInviteResponseDto>('workspace.invite.list', {
            dto: WorkspaceInviteResponseDto,
            type: EnumPaginationType.offset,
            availableSearch: WorkspaceInviteDefaultAvailableSearch,
            availableOrder: WorkspaceInviteDefaultAvailableOrderBy,
        })
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
            dto: WorkspaceInviteCreateRequestDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.inviteDuplicate,
            messagePath: 'workspace.error.inviteDuplicate',
        }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.inviteProjectMismatch,
            messagePath: 'workspace.error.inviteProjectMismatch',
        }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.inviteRoleRequired,
            messagePath: 'workspace.error.inviteRoleRequired',
        }),
        DocResponse<WorkspaceInviteResponseDto>('workspace.invite.create', {
            dto: WorkspaceInviteResponseDto,
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
            params: WorkspaceInviteDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: WorkspaceInviteResendRequestDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocOneOf(HttpStatus.NOT_FOUND, {
            statusCode: EnumWorkspaceStatusCodeError.inviteNotFound,
            messagePath: 'workspace.error.inviteNotFound',
        }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
            messagePath: 'workspace.error.inviteAlreadyProcessed',
        }),
        DocResponse<WorkspaceInviteResponseDto>('workspace.invite.resend', {
            dto: WorkspaceInviteResponseDto,
        })
    );
}

export function WorkspaceInviteUserRevokeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'revoke a pending invite for the current workspace' }),
        DocRequest({ params: WorkspaceInviteDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocOneOf(HttpStatus.NOT_FOUND, {
            statusCode: EnumWorkspaceStatusCodeError.inviteNotFound,
            messagePath: 'workspace.error.inviteNotFound',
        }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
            messagePath: 'workspace.error.inviteAlreadyProcessed',
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
            dto: WorkspaceInviteClaimRequestDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
            messagePath: 'workspace.error.inviteInvalid',
        }),
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
            dto: WorkspaceJoinRequestCreateRequestDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.notPublic,
            messagePath: 'workspace.error.notPublic',
        }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.joinRequestAlreadyMember,
            messagePath: 'workspace.error.joinRequestAlreadyMember',
        }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.joinRequestDuplicate,
            messagePath: 'workspace.error.joinRequestDuplicate',
        }),
        DocResponse<WorkspaceJoinRequestResponseDto>(
            'workspace.joinRequest.create',
            {
                dto: WorkspaceJoinRequestResponseDto,
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
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocResponsePaging<WorkspaceJoinRequestResponseDto>(
            'workspace.joinRequest.list',
            {
                dto: WorkspaceJoinRequestResponseDto,
                type: EnumPaginationType.offset,
                availableOrder: WorkspaceJoinRequestDefaultAvailableOrderBy,
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
        DocRequest({ params: WorkspaceJoinRequestDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocOneOf(HttpStatus.NOT_FOUND, {
            statusCode: EnumWorkspaceStatusCodeError.joinRequestNotFound,
            messagePath: 'workspace.error.joinRequestNotFound',
        }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
            messagePath: 'workspace.error.joinRequestAlreadyProcessed',
        }),
        DocResponse('workspace.joinRequest.accept')
    );
}

export function WorkspaceJoinRequestUserRejectDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'reject a pending join request with a reason code' }),
        DocRequest({
            params: WorkspaceJoinRequestDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: WorkspaceJoinRequestRejectRequestDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        RoleForbiddenDoc,
        DocOneOf(HttpStatus.NOT_FOUND, {
            statusCode: EnumWorkspaceStatusCodeError.joinRequestNotFound,
            messagePath: 'workspace.error.joinRequestNotFound',
        }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
            messagePath: 'workspace.error.joinRequestAlreadyProcessed',
        }),
        DocResponse('workspace.joinRequest.reject')
    );
}
