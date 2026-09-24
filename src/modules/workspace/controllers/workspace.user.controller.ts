import type { WorkspaceJoinRequestListRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';
import { WorkspaceJoinRequestListRequestSchema } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';
import type { WorkspaceInviteListRequestDto } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import { WorkspaceInviteListRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import type { WorkspaceMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.member-list.request.dto';
import { WorkspaceMemberListRequestSchema } from '@modules/workspace/dtos/request/workspace.member-list.request.dto';
import type { WorkspaceUserListRequestDto } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';
import { WorkspaceUserListRequestSchema } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';

import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';

import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';

import type {
    Workspace,
    WorkspaceInvite,
    WorkspaceJoinRequest,
    WorkspaceMember,
} from '@generated/prisma-client/client';

import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';

import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';

import { WorkspaceCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceInviteClaimRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import type { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import { WorkspaceInviteCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { WorkspaceInviteResendRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceJoinRequestCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceJoinRequestRejectRequestSchema } from '@modules/workspace/dtos/request/workspace.join-request-reject.request.dto';
import type { WorkspaceJoinRequestRejectRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-reject.request.dto';
import { WorkspaceMemberUpdateRoleRequestSchema } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import { WorkspaceSwitchRequestSchema } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import type { WorkspaceSwitchRequestDto } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import { WorkspaceTransferOwnershipRequestSchema } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { WorkspaceUpdateIsPublicRequestSchema } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';
import type { WorkspaceUpdateIsPublicRequestDto } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';
import { WorkspaceUpdateSlugRequestSchema } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import type { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import { WorkspaceUpdateRequestSchema } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import type { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspaceInviteResponseSchema } from '@modules/workspace/dtos/response/workspace.invite.response.dto';
import { WorkspaceJoinRequestResponseSchema } from '@modules/workspace/dtos/response/workspace.join-request.response.dto';
import { WorkspaceMemberResponseSchema } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import { WorkspaceResponseSchema } from '@modules/workspace/dtos/response/workspace.response.dto';
import type {
    IWorkspaceInviteList,
    IWorkspaceMember,
} from '@modules/workspace/interfaces/workspace.interface';

import {
    WorkspaceCurrent,
    WorkspaceMemberCurrent,
    WorkspaceMemberProtected,
    WorkspaceProtected,
} from '@modules/workspace/decorators/workspace.decorator';

import { WorkspaceHttpService } from '@modules/workspace/services/workspace.http.service';
import { WorkspaceInviteHttpService } from '@modules/workspace/services/workspace.invite.http.service';
import { WorkspaceJoinRequestHttpService } from '@modules/workspace/services/workspace.join-request.http.service';
import { WorkspaceMemberHttpService } from '@modules/workspace/services/workspace.member.http.service';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    Query,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.user.workspace')
@Controller({
    version: '1',
    path: '/workspace',
})
export class WorkspaceUserController {
    constructor(
        private readonly workspaceHttpService: WorkspaceHttpService,
        private readonly workspaceMemberHttpService: WorkspaceMemberHttpService,
        private readonly workspaceInviteHttpService: WorkspaceInviteHttpService,
        private readonly workspaceJoinRequestHttpService: WorkspaceJoinRequestHttpService
    ) {}

    @Doc({ summary: 'list workspaces the caller is a member of' })
    @ResponsePagination('workspace.list', {
        schema: WorkspaceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @Query({ schema: WorkspaceUserListRequestSchema })
        query: WorkspaceUserListRequestDto,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePaginationReturn<Workspace>> {
        return this.workspaceHttpService.getListForMember(userId, query);
    }

    @Doc({ summary: 'create a new workspace; caller becomes owner' })
    @Response('workspace.create', { schema: WorkspaceResponseSchema })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/create')
    async create(
        @AuthJwtPayload('userId') userId: string,
        @Body({ schema: WorkspaceCreateRequestSchema })
        body: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceHttpService.createWorkspace(userId, body);
    }

    @Doc({ summary: 'get the current workspace (`x-workspace-id`)' })
    @Response('workspace.get', {
        schema: WorkspaceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/get')
    async get(
        @WorkspaceCurrent() workspace: Workspace
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceHttpService.getCurrentWorkspace(workspace);
    }

    @Doc({ summary: 'update the current workspace name/description' })
    @Response('workspace.update', {
        schema: WorkspaceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/update')
    async update(
        @WorkspaceCurrent() workspace: Workspace,
        @AuthJwtPayload('userId') userId: string,
        @Body({ schema: WorkspaceUpdateRequestSchema })
        body: WorkspaceUpdateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceHttpService.updateWorkspace(
            workspace.id,
            userId,
            body
        );
    }

    @Doc({
        summary:
            'update the current workspace public visibility; a public workspace is discoverable and accepts join requests',
    })
    @Response('workspace.updateIsPublic', {
        schema: WorkspaceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/update/is-public')
    async updateIsPublic(
        @WorkspaceCurrent() workspace: Workspace,
        @AuthJwtPayload('userId') userId: string,
        @Body({ schema: WorkspaceUpdateIsPublicRequestSchema })
        body: WorkspaceUpdateIsPublicRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceHttpService.updateWorkspaceIsPublic(
            workspace.id,
            userId,
            body
        );
    }

    @Doc({ summary: 'update the current workspace slug' })
    @Response('workspace.updateSlug', {
        schema: WorkspaceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/update/slug')
    async updateSlug(
        @WorkspaceCurrent() workspace: Workspace,
        @AuthJwtPayload('userId') userId: string,
        @Body({ schema: WorkspaceUpdateSlugRequestSchema })
        body: WorkspaceUpdateSlugRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceHttpService.updateWorkspaceSlug(
            workspace.id,
            userId,
            body
        );
    }

    @Doc({
        summary:
            'switch active workspace; persists lastWorkspaceId, client must then send the new x-workspace-id header',
    })
    @Response('workspace.switch')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/switch')
    async switch(
        @AuthJwtPayload('userId') userId: string,
        @Body({ schema: WorkspaceSwitchRequestSchema })
        body: WorkspaceSwitchRequestDto
    ): Promise<void> {
        await this.workspaceHttpService.switchWorkspace(userId, body);
    }

    @Doc({ summary: 'transfer workspace ownership to another member' })
    @Response('workspace.transferOwnership')
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.owner)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/ownership/transfer')
    async ownershipTransfer(
        @WorkspaceCurrent() workspace: Workspace,
        @WorkspaceMemberCurrent() member: WorkspaceMember,
        @Body({ schema: WorkspaceTransferOwnershipRequestSchema })
        body: WorkspaceTransferOwnershipRequestDto
    ): Promise<void> {
        await this.workspaceMemberHttpService.transferOwnership(
            workspace.id,
            member,
            body
        );
    }

    @Doc({ summary: 'leave the current workspace' })
    @Response('workspace.leave')
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/leave')
    async leave(
        @WorkspaceCurrent() workspace: Workspace,
        @WorkspaceMemberCurrent() member: WorkspaceMember
    ): Promise<void> {
        await this.workspaceMemberHttpService.leaveWorkspace(
            workspace.id,
            member
        );
    }

    @Doc({ summary: 'soft-delete the current workspace' })
    @Response('workspace.softDelete')
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.owner)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/delete')
    async softDelete(
        @WorkspaceCurrent() workspace: Workspace,
        @AuthJwtPayload('userId') userId: string
    ): Promise<void> {
        await this.workspaceHttpService.softDeleteWorkspace(
            workspace.id,
            userId
        );
    }

    @Doc({ summary: 'list members of the current workspace' })
    @ResponsePagination('workspace.member.list', {
        schema: WorkspaceMemberResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/member/list')
    async memberList(
        @Query({ schema: WorkspaceMemberListRequestSchema })
        query: WorkspaceMemberListRequestDto,
        @WorkspaceCurrent() workspace: Workspace
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        return this.workspaceMemberHttpService.getMembersList(
            workspace.id,
            query
        );
    }

    @Doc({ summary: 'update a member role in the current workspace' })
    @Response('workspace.member.updateRole')
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/member/:workspaceMemberId/role/update')
    async memberUpdateRole(
        @WorkspaceCurrent() workspace: Workspace,
        @WorkspaceMemberCurrent() actorMember: WorkspaceMember,
        @Param('workspaceMemberId', { schema: RequestUuidSchema })
        workspaceMemberId: string,
        @Body({ schema: WorkspaceMemberUpdateRoleRequestSchema })
        body: WorkspaceMemberUpdateRoleRequestDto
    ): Promise<void> {
        await this.workspaceMemberHttpService.updateMemberRole(
            workspace.id,
            actorMember,
            workspaceMemberId,
            body
        );
    }

    @Doc({ summary: 'remove a member from the current workspace' })
    @Response('workspace.member.remove')
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/member/:workspaceMemberId/remove')
    async memberRemove(
        @WorkspaceCurrent() workspace: Workspace,
        @WorkspaceMemberCurrent() actorMember: WorkspaceMember,
        @Param('workspaceMemberId', { schema: RequestUuidSchema })
        workspaceMemberId: string
    ): Promise<void> {
        await this.workspaceMemberHttpService.removeMember(
            workspace.id,
            actorMember,
            workspaceMemberId
        );
    }

    @Doc({ summary: 'list invites for the current workspace' })
    @ResponsePagination('workspace.invite.list', {
        schema: WorkspaceInviteResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/invite/list')
    async inviteList(
        @Query({ schema: WorkspaceInviteListRequestSchema })
        query: WorkspaceInviteListRequestDto,
        @WorkspaceCurrent() workspace: Workspace
    ): Promise<IResponsePaginationReturn<IWorkspaceInviteList>> {
        return this.workspaceInviteHttpService.getInvitesList(
            workspace.id,
            query
        );
    }

    @Doc({
        summary:
            'invite a member to the current workspace by email; token is hashed at rest',
    })
    @Response('workspace.invite.create', {
        schema: WorkspaceInviteResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/invite/create')
    async inviteCreate(
        @WorkspaceCurrent() workspace: Workspace,
        @AuthJwtPayload('userId') userId: string,
        @Body({ schema: WorkspaceInviteCreateRequestSchema })
        body: WorkspaceInviteCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        return this.workspaceInviteHttpService.createInvite(
            workspace,
            userId,
            body
        );
    }

    @Doc({
        summary:
            'rotate the token and expiry of a pending invite and resend it; the old link stops working',
    })
    @Response('workspace.invite.resend', {
        schema: WorkspaceInviteResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/invite/:workspaceInviteId/resend')
    async inviteResend(
        @WorkspaceCurrent() workspace: Workspace,
        @AuthJwtPayload('userId') userId: string,
        @Param('workspaceInviteId', { schema: RequestUuidSchema })
        workspaceInviteId: string,
        @Body({ schema: WorkspaceInviteResendRequestSchema })
        body: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        return this.workspaceInviteHttpService.resendInvite(
            workspace,
            userId,
            workspaceInviteId,
            body
        );
    }

    @Doc({ summary: 'revoke a pending invite for the current workspace' })
    @Response('workspace.invite.revoke')
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/invite/:workspaceInviteId/revoke')
    async inviteRevoke(
        @WorkspaceCurrent() workspace: Workspace,
        @AuthJwtPayload('userId') userId: string,
        @Param('workspaceInviteId', { schema: RequestUuidSchema })
        workspaceInviteId: string
    ): Promise<void> {
        await this.workspaceInviteHttpService.revokeInvite(
            workspace.id,
            userId,
            workspaceInviteId
        );
    }

    @Doc({
        summary:
            'claim a workspace invite as the already-authenticated caller; joins the invited workspace (and project, if any)',
    })
    @Response('workspace.invite.claim')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/invite/claim')
    async inviteClaim(
        @AuthJwtPayload('userId') userId: string,
        @AuthJwtPayload('email') email: string,
        @Body({ schema: WorkspaceInviteClaimRequestSchema })
        body: WorkspaceInviteClaimRequestDto
    ): Promise<void> {
        await this.workspaceInviteHttpService.claimInvite(userId, email, body);
    }

    @Doc({
        summary:
            'request to join a public workspace the caller is not yet a member of',
    })
    @Response('workspace.joinRequest.create', {
        schema: WorkspaceJoinRequestResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/join-request/create')
    async joinRequestCreate(
        @AuthJwtPayload('userId') userId: string,
        @Body({ schema: WorkspaceJoinRequestCreateRequestSchema })
        body: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequest>> {
        return this.workspaceJoinRequestHttpService.createJoinRequest(
            userId,
            body
        );
    }

    @Doc({ summary: 'list join requests for the current workspace' })
    @ResponsePagination('workspace.joinRequest.list', {
        schema: WorkspaceJoinRequestResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/join-request/list')
    async joinRequestList(
        @Query({ schema: WorkspaceJoinRequestListRequestSchema })
        query: WorkspaceJoinRequestListRequestDto,
        @WorkspaceCurrent() workspace: Workspace
    ): Promise<IResponsePaginationReturn<WorkspaceJoinRequest>> {
        return this.workspaceJoinRequestHttpService.getJoinRequestsList(
            workspace.id,
            query
        );
    }

    @Doc({
        summary:
            'accept a pending join request; creates the requester as a member',
    })
    @Response('workspace.joinRequest.accept')
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/join-request/:workspaceJoinRequestId/accept')
    async joinRequestAccept(
        @WorkspaceCurrent() workspace: Workspace,
        @AuthJwtPayload('userId') userId: string,
        @Param('workspaceJoinRequestId', { schema: RequestUuidSchema })
        workspaceJoinRequestId: string
    ): Promise<void> {
        await this.workspaceJoinRequestHttpService.acceptJoinRequest(
            workspace,
            userId,
            workspaceJoinRequestId
        );
    }

    @Doc({ summary: 'reject a pending join request with a reason code' })
    @Response('workspace.joinRequest.reject')
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/join-request/:workspaceJoinRequestId/reject')
    async joinRequestReject(
        @WorkspaceCurrent() workspace: Workspace,
        @AuthJwtPayload('userId') userId: string,
        @Param('workspaceJoinRequestId', { schema: RequestUuidSchema })
        workspaceJoinRequestId: string,
        @Body({ schema: WorkspaceJoinRequestRejectRequestSchema })
        body: WorkspaceJoinRequestRejectRequestDto
    ): Promise<void> {
        await this.workspaceJoinRequestHttpService.rejectJoinRequest(
            workspace,
            userId,
            workspaceJoinRequestId,
            body
        );
    }
}
