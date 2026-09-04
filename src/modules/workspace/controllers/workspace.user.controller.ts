import {
    PaginationCursorQuery,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
    Prisma,
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    WorkspaceCursorAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
    WorkspaceInviteDefaultAvailableOrderBy,
    WorkspaceInviteDefaultAvailableSearch,
    WorkspaceInviteDefaultStatus,
    WorkspaceJoinRequestDefaultAvailableOrderBy,
    WorkspaceJoinRequestDefaultStatus,
    WorkspaceMemberDefaultAvailableOrderBy,
    WorkspaceMemberDefaultRole,
} from '@modules/workspace/constants/workspace.list.constant';
import {
    WorkspaceInviteUserClaimDoc,
    WorkspaceInviteUserCreateDoc,
    WorkspaceInviteUserListDoc,
    WorkspaceInviteUserResendDoc,
    WorkspaceInviteUserRevokeDoc,
    WorkspaceJoinRequestUserAcceptDoc,
    WorkspaceJoinRequestUserCreateDoc,
    WorkspaceJoinRequestUserListDoc,
    WorkspaceJoinRequestUserRejectDoc,
    WorkspaceMemberUserListDoc,
    WorkspaceMemberUserRemoveDoc,
    WorkspaceMemberUserUpdateRoleDoc,
    WorkspaceUserCreateDoc,
    WorkspaceUserGetDoc,
    WorkspaceUserLeaveDoc,
    WorkspaceUserListDoc,
    WorkspaceUserSoftDeleteDoc,
    WorkspaceUserSwitchDoc,
    WorkspaceUserTransferOwnershipDoc,
    WorkspaceUserUpdateDoc,
    WorkspaceUserUpdateIsPublicDoc,
    WorkspaceUserUpdateSlugDoc,
} from '@modules/workspace/docs/workspace.user.doc';
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

    @WorkspaceUserListDoc()
    @ResponsePaging('workspace.list')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableSearch: WorkspaceDefaultAvailableSearch,
            availableOrderBy: WorkspaceCursorAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePagingReturn<WorkspaceResponseDto>> {
        return this.workspaceHttpService.getListForMember(userId, pagination);
    }

    @WorkspaceUserCreateDoc()
    @Response('workspace.create')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/create')
    async create(
        @AuthJwtPayload('userId') userId: string,
        @Body() body: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        return this.workspaceHttpService.createWorkspace(userId, body);
    }

    @WorkspaceUserGetDoc()
    @Response('workspace.get')
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
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        return this.workspaceHttpService.getCurrentWorkspace(workspace);
    }

    @WorkspaceUserUpdateDoc()
    @Response('workspace.update')
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
        @Body() body: WorkspaceUpdateRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        return this.workspaceHttpService.updateWorkspace(
            workspace.id,
            userId,
            body
        );
    }

    @WorkspaceUserUpdateIsPublicDoc()
    @Response('workspace.updateIsPublic')
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
        @Body() body: WorkspaceUpdateIsPublicRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        return this.workspaceHttpService.updateWorkspaceIsPublic(
            workspace.id,
            userId,
            body
        );
    }

    @WorkspaceUserUpdateSlugDoc()
    @Response('workspace.updateSlug')
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
        @Body() body: WorkspaceUpdateSlugRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        return this.workspaceHttpService.updateWorkspaceSlug(
            workspace.id,
            userId,
            body
        );
    }

    @WorkspaceUserSwitchDoc()
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
        @Body() body: WorkspaceSwitchRequestDto
    ): Promise<void> {
        await this.workspaceHttpService.switchWorkspace(userId, body);
    }

    @WorkspaceUserTransferOwnershipDoc()
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
        @Body() body: WorkspaceTransferOwnershipRequestDto
    ): Promise<void> {
        await this.workspaceMemberHttpService.transferOwnership(
            workspace.id,
            member,
            body
        );
    }

    @WorkspaceUserLeaveDoc()
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
        await this.workspaceMemberHttpService.leaveWorkspace(workspace.id, member);
    }

    @WorkspaceUserSoftDeleteDoc()
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
        await this.workspaceHttpService.softDeleteWorkspace(workspace.id, userId);
    }

    @WorkspaceMemberUserListDoc()
    @ResponsePaging('workspace.member.list')
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
        @PaginationCursorQuery({
            availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<
            Prisma.WorkspaceMemberWhereInput
        >,
        @WorkspaceCurrent() workspace: Workspace,
        @PaginationQueryFilterInEnum<EnumWorkspaceMemberRole>(
            'role',
            WorkspaceMemberDefaultRole
        )
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceMemberResponseDto>> {
        return this.workspaceMemberHttpService.getMembersList(
            workspace.id,
            pagination,
            role
        );
    }

    @WorkspaceMemberUserUpdateRoleDoc()
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
        @Param(
            'workspaceMemberId',
            RequestRequiredPipe,
            RequestIsValidObjectIdPipe
        )
        workspaceMemberId: string,
        @Body() body: WorkspaceMemberUpdateRoleRequestDto
    ): Promise<void> {
        await this.workspaceMemberHttpService.updateMemberRole(
            workspace.id,
            actorMember,
            workspaceMemberId,
            body
        );
    }

    @WorkspaceMemberUserRemoveDoc()
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
        @Param(
            'workspaceMemberId',
            RequestRequiredPipe,
            RequestIsValidObjectIdPipe
        )
        workspaceMemberId: string
    ): Promise<void> {
        await this.workspaceMemberHttpService.removeMember(
            workspace.id,
            actorMember,
            workspaceMemberId
        );
    }

    @WorkspaceInviteUserListDoc()
    @ResponsePaging('workspace.invite.list')
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
        @PaginationCursorQuery({
            availableSearch: WorkspaceInviteDefaultAvailableSearch,
            availableOrderBy: WorkspaceInviteDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<
            Prisma.WorkspaceInviteWhereInput
        >,
        @WorkspaceCurrent() workspace: Workspace,
        @PaginationQueryFilterInEnum<EnumWorkspaceInviteStatus>(
            'status',
            WorkspaceInviteDefaultStatus
        )
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceInviteResponseDto>> {
        return this.workspaceInviteHttpService.getInvitesList(
            workspace.id,
            pagination,
            status
        );
    }

    @WorkspaceInviteUserCreateDoc()
    @Response('workspace.invite.create')
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
        @Body() body: WorkspaceInviteCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceInviteResponseDto>> {
        return this.workspaceInviteHttpService.createInvite(
            workspace,
            userId,
            body
        );
    }

    @WorkspaceInviteUserResendDoc()
    @Response('workspace.invite.resend')
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
        @Param(
            'workspaceInviteId',
            RequestRequiredPipe,
            RequestIsValidObjectIdPipe
        )
        workspaceInviteId: string,
        @Body() body: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<WorkspaceInviteResponseDto>> {
        return this.workspaceInviteHttpService.resendInvite(
            workspace,
            userId,
            workspaceInviteId,
            body
        );
    }

    @WorkspaceInviteUserRevokeDoc()
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
        @Param(
            'workspaceInviteId',
            RequestRequiredPipe,
            RequestIsValidObjectIdPipe
        )
        workspaceInviteId: string
    ): Promise<void> {
        await this.workspaceInviteHttpService.revokeInvite(
            workspace.id,
            userId,
            workspaceInviteId
        );
    }

    @WorkspaceInviteUserClaimDoc()
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
        @Body() body: WorkspaceInviteClaimRequestDto
    ): Promise<void> {
        await this.workspaceInviteHttpService.claimInvite(userId, email, body);
    }

    @WorkspaceJoinRequestUserCreateDoc()
    @Response('workspace.joinRequest.create')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/join-request/create')
    async joinRequestCreate(
        @AuthJwtPayload('userId') userId: string,
        @Body() body: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequestResponseDto>> {
        return this.workspaceJoinRequestHttpService.createJoinRequest(userId, body);
    }

    @WorkspaceJoinRequestUserListDoc()
    @ResponsePaging('workspace.joinRequest.list')
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
        @PaginationCursorQuery({
            availableOrderBy: WorkspaceJoinRequestDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<
            Prisma.WorkspaceJoinRequestWhereInput
        >,
        @WorkspaceCurrent() workspace: Workspace,
        @PaginationQueryFilterInEnum<EnumWorkspaceJoinRequestStatus>(
            'status',
            WorkspaceJoinRequestDefaultStatus
        )
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceJoinRequestResponseDto>> {
        return this.workspaceJoinRequestHttpService.getJoinRequestsList(
            workspace.id,
            pagination,
            status
        );
    }

    @WorkspaceJoinRequestUserAcceptDoc()
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
        @Param(
            'workspaceJoinRequestId',
            RequestRequiredPipe,
            RequestIsValidObjectIdPipe
        )
        workspaceJoinRequestId: string
    ): Promise<void> {
        await this.workspaceJoinRequestHttpService.acceptJoinRequest(
            workspace,
            userId,
            workspaceJoinRequestId
        );
    }

    @WorkspaceJoinRequestUserRejectDoc()
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
        @Param(
            'workspaceJoinRequestId',
            RequestRequiredPipe,
            RequestIsValidObjectIdPipe
        )
        workspaceJoinRequestId: string,
        @Body() body: WorkspaceJoinRequestRejectRequestDto
    ): Promise<void> {
        await this.workspaceJoinRequestHttpService.rejectJoinRequest(
            workspace,
            userId,
            workspaceJoinRequestId,
            body
        );
    }
}
