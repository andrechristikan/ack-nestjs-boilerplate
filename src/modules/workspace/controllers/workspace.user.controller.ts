import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import type { WorkspaceJoinRequestListRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';
import { WorkspaceJoinRequestListRequestSchema } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';
import type { WorkspaceInviteListRequestDto } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import { WorkspaceInviteListRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import type { WorkspaceMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.member-list.request.dto';
import { WorkspaceMemberListRequestSchema } from '@modules/workspace/dtos/request/workspace.member-list.request.dto';
import type { WorkspaceUserListRequestDto } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';
import { WorkspaceUserListRequestSchema } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    RequestContext,
    RequestThrottle,
} from '@common/request/decorators/request.decorator';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import {
    PolicyAbilityProtected,
    PolicyContext,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';
import type {
    Workspace,
    WorkspaceInvite,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import {
    ApiKeyContext,
    ApiKeyProtected,
} from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessContext,
    AuthJwtAccessProtected,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { EnumFeatureFlagKey } from '@modules/feature-flag/enums/feature-flag.enum';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    UserContext,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
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
    IWorkspaceContext,
    IWorkspaceInviteList,
    IWorkspaceMember,
} from '@modules/workspace/interfaces/workspace.interface';
import {
    WorkspaceContext,
    WorkspaceMemberProtected,
    WorkspaceProtected,
} from '@modules/workspace/decorators/workspace.decorator';
import { WorkspaceGetListCursorByMemberUseCase } from '@modules/workspace/use-cases/workspace.get-list-cursor-by-member.use-case';
import { WorkspaceCreateUseCase } from '@modules/workspace/use-cases/workspace.create.use-case';
import { WorkspaceGetCurrentUseCase } from '@modules/workspace/use-cases/workspace.get-current.use-case';
import { WorkspaceUpdateUseCase } from '@modules/workspace/use-cases/workspace.update.use-case';
import { WorkspaceUpdateIsPublicUseCase } from '@modules/workspace/use-cases/workspace.update-is-public.use-case';
import { WorkspaceUpdateSlugUseCase } from '@modules/workspace/use-cases/workspace.update-slug.use-case';
import { WorkspaceSwitchUseCase } from '@modules/workspace/use-cases/workspace.switch.use-case';
import { WorkspaceTransferOwnershipUseCase } from '@modules/workspace/use-cases/workspace.transfer-ownership.use-case';
import { WorkspaceLeaveUseCase } from '@modules/workspace/use-cases/workspace.leave.use-case';
import { WorkspaceSoftDeleteUseCase } from '@modules/workspace/use-cases/workspace.soft-delete.use-case';
import { WorkspaceGetMembersListUseCase } from '@modules/workspace/use-cases/workspace.get-members-list.use-case';
import { WorkspaceGetPermissionsUseCase } from '@modules/workspace/use-cases/workspace.get-permissions.use-case';
import { WorkspacePermissionResponseSchema } from '@modules/workspace/dtos/response/workspace.permission.response.dto';
import type { WorkspacePermissionResponseDto } from '@modules/workspace/dtos/response/workspace.permission.response.dto';
import { WorkspaceUpdateMemberRoleUseCase } from '@modules/workspace/use-cases/workspace.update-member-role.use-case';
import { WorkspaceRemoveMemberUseCase } from '@modules/workspace/use-cases/workspace.remove-member.use-case';
import { WorkspaceGetInvitesListUseCase } from '@modules/workspace/use-cases/workspace.get-invites-list.use-case';
import { WorkspaceCreateInviteUseCase } from '@modules/workspace/use-cases/workspace.create-invite.use-case';
import { WorkspaceResendInviteUseCase } from '@modules/workspace/use-cases/workspace.resend-invite.use-case';
import { WorkspaceRevokeInviteUseCase } from '@modules/workspace/use-cases/workspace.revoke-invite.use-case';
import { WorkspaceClaimInviteUseCase } from '@modules/workspace/use-cases/workspace.claim-invite.use-case';
import { WorkspaceCreateJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.create-join-request.use-case';
import { WorkspaceGetJoinRequestsListUseCase } from '@modules/workspace/use-cases/workspace.get-join-requests-list.use-case';
import { WorkspaceAcceptJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.accept-join-request.use-case';
import { WorkspaceRejectJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.reject-join-request.use-case';
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
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@ApiTags('modules.user.workspace')
@Controller({
    version: '1',
    path: '/workspace',
})
export class WorkspaceUserController {
    constructor(
        private readonly workspaceGetListCursorByMemberUseCase: WorkspaceGetListCursorByMemberUseCase,
        private readonly workspaceCreateUseCase: WorkspaceCreateUseCase,
        private readonly workspaceGetCurrentUseCase: WorkspaceGetCurrentUseCase,
        private readonly workspaceUpdateUseCase: WorkspaceUpdateUseCase,
        private readonly workspaceUpdateIsPublicUseCase: WorkspaceUpdateIsPublicUseCase,
        private readonly workspaceUpdateSlugUseCase: WorkspaceUpdateSlugUseCase,
        private readonly workspaceSwitchUseCase: WorkspaceSwitchUseCase,
        private readonly workspaceTransferOwnershipUseCase: WorkspaceTransferOwnershipUseCase,
        private readonly workspaceLeaveUseCase: WorkspaceLeaveUseCase,
        private readonly workspaceSoftDeleteUseCase: WorkspaceSoftDeleteUseCase,
        private readonly workspaceGetMembersListUseCase: WorkspaceGetMembersListUseCase,
        private readonly workspaceUpdateMemberRoleUseCase: WorkspaceUpdateMemberRoleUseCase,
        private readonly workspaceGetPermissionsUseCase: WorkspaceGetPermissionsUseCase,
        private readonly workspaceRemoveMemberUseCase: WorkspaceRemoveMemberUseCase,
        private readonly workspaceGetInvitesListUseCase: WorkspaceGetInvitesListUseCase,
        private readonly workspaceCreateInviteUseCase: WorkspaceCreateInviteUseCase,
        private readonly workspaceResendInviteUseCase: WorkspaceResendInviteUseCase,
        private readonly workspaceRevokeInviteUseCase: WorkspaceRevokeInviteUseCase,
        private readonly workspaceClaimInviteUseCase: WorkspaceClaimInviteUseCase,
        private readonly workspaceCreateJoinRequestUseCase: WorkspaceCreateJoinRequestUseCase,
        private readonly workspaceGetJoinRequestsListUseCase: WorkspaceGetJoinRequestsListUseCase,
        private readonly workspaceAcceptJoinRequestUseCase: WorkspaceAcceptJoinRequestUseCase,
        private readonly workspaceRejectJoinRequestUseCase: WorkspaceRejectJoinRequestUseCase
    ) {}

    @Doc({ summary: 'list workspaces the caller is a member of' })
    @ResponsePagination('workspace.list', {
        schema: WorkspaceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @Query({ schema: WorkspaceUserListRequestSchema })
        query: WorkspaceUserListRequestDto
    ): Promise<IResponsePaginationReturn<Workspace>> {
        return this.workspaceGetListCursorByMemberUseCase.execute(
            authContext,
            query
        );
    }

    @Doc({ summary: 'create a new workspace; caller becomes owner' })
    @Response('workspace.create', { schema: WorkspaceResponseSchema })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @Body({ schema: WorkspaceCreateRequestSchema })
        body: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceCreateUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            body
        );
    }

    @Doc({ summary: 'get the current workspace (`x-workspace-id`)' })
    @Response('workspace.get', {
        schema: WorkspaceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Workspace,
        action: [EnumPolicyAction.read],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get')
    async get(
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceGetCurrentUseCase.execute(
            workspaceContext,
            policyContext
        );
    }

    @Doc({ summary: 'get the permissions the caller holds in the workspace' })
    @Response('workspace.permissions', {
        schema: WorkspacePermissionResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/permissions')
    async permissions(
        @PolicyContext() policyContext: IPolicyContext
    ): Promise<IResponseReturn<WorkspacePermissionResponseDto>> {
        return this.workspaceGetPermissionsUseCase.execute(policyContext);
    }

    @Doc({ summary: 'update the current workspace name/description' })
    @Response('workspace.update', {
        schema: WorkspaceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Workspace,
        action: [EnumPolicyAction.update],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update')
    async update(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Body({ schema: WorkspaceUpdateRequestSchema })
        body: WorkspaceUpdateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceUpdateUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            policyContext,
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
    @PolicyProtected({
        subject: EnumPolicySubject.Workspace,
        action: [EnumPolicyAction.update],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/is-public')
    async updateIsPublic(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Body({ schema: WorkspaceUpdateIsPublicRequestSchema })
        body: WorkspaceUpdateIsPublicRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceUpdateIsPublicUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            policyContext,
            body
        );
    }

    @Doc({ summary: 'update the current workspace slug' })
    @Response('workspace.updateSlug', {
        schema: WorkspaceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Workspace,
        action: [EnumPolicyAction.update],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/slug')
    async updateSlug(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Body({ schema: WorkspaceUpdateSlugRequestSchema })
        body: WorkspaceUpdateSlugRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceUpdateSlugUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            policyContext,
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
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/switch')
    async switch(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @Body({ schema: WorkspaceSwitchRequestSchema })
        body: WorkspaceSwitchRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.workspaceSwitchUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            body
        );
    }

    @Doc({ summary: 'transfer workspace ownership to another member' })
    @Response('workspace.transferOwnership')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Workspace,
        action: [EnumPolicyAction.manage],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/ownership/transfer')
    async ownershipTransfer(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Body({ schema: WorkspaceTransferOwnershipRequestSchema })
        body: WorkspaceTransferOwnershipRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.workspaceTransferOwnershipUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            policyContext,
            body
        );
    }

    @Doc({ summary: 'leave the current workspace' })
    @Response('workspace.leave')
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/leave')
    async leave(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext
    ): Promise<IResponseReturn<void>> {
        return this.workspaceLeaveUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext
        );
    }

    @Doc({ summary: 'soft-delete the current workspace' })
    @Response('workspace.softDelete')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Workspace,
        action: [EnumPolicyAction.delete],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete')
    async softDelete(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext
    ): Promise<IResponseReturn<void>> {
        return this.workspaceSoftDeleteUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            policyContext
        );
    }

    @Doc({ summary: 'list members of the current workspace' })
    @ResponsePagination('workspace.member.list', {
        schema: WorkspaceMemberResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceMember,
        action: [EnumPolicyAction.read],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/member/list')
    async memberList(
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Query({ schema: WorkspaceMemberListRequestSchema })
        query: WorkspaceMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        return this.workspaceGetMembersListUseCase.execute(
            workspaceContext,
            policyContext,
            query
        );
    }

    @Doc({ summary: 'update a member role in the current workspace' })
    @Response('workspace.member.updateRole')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceMember,
        action: [EnumPolicyAction.update],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/member/:workspaceMemberId/role/update')
    async memberUpdateRole(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('workspaceMemberId', { schema: RequestUuidSchema })
        workspaceMemberId: string,
        @Body({ schema: WorkspaceMemberUpdateRoleRequestSchema })
        body: WorkspaceMemberUpdateRoleRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.workspaceUpdateMemberRoleUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            policyContext,
            workspaceMemberId,
            body
        );
    }

    @Doc({ summary: 'remove a member from the current workspace' })
    @Response('workspace.member.remove')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceMember,
        action: [EnumPolicyAction.delete],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/member/:workspaceMemberId/remove')
    async memberRemove(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('workspaceMemberId', { schema: RequestUuidSchema })
        workspaceMemberId: string
    ): Promise<IResponseReturn<void>> {
        return this.workspaceRemoveMemberUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            policyContext,
            workspaceMemberId
        );
    }

    @Doc({ summary: 'list invites for the current workspace' })
    @ResponsePagination('workspace.invite.list', {
        schema: WorkspaceInviteResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceInvite,
        action: [EnumPolicyAction.read],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/invite/list')
    async inviteList(
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Query({ schema: WorkspaceInviteListRequestSchema })
        query: WorkspaceInviteListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceInviteList>> {
        return this.workspaceGetInvitesListUseCase.execute(
            workspaceContext,
            policyContext,
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
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceInvite,
        action: [EnumPolicyAction.create],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/invite/create')
    async inviteCreate(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Body({ schema: WorkspaceInviteCreateRequestSchema })
        body: WorkspaceInviteCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        return this.workspaceCreateInviteUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            policyContext,
            body
        );
    }

    @Doc({
        summary:
            'rotate the token and expiry of an unexpired pending invite and resend it; the old link stops working',
    })
    @Response('workspace.invite.resend', {
        schema: WorkspaceInviteResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceInvite,
        action: [EnumPolicyAction.update],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/invite/:workspaceInviteId/resend')
    async inviteResend(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('workspaceInviteId', { schema: RequestUuidSchema })
        workspaceInviteId: string,
        @Body({ schema: WorkspaceInviteResendRequestSchema })
        body: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        return this.workspaceResendInviteUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            policyContext,
            workspaceInviteId,
            body
        );
    }

    @Doc({ summary: 'revoke a pending invite for the current workspace' })
    @Response('workspace.invite.revoke')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceInvite,
        action: [EnumPolicyAction.delete],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/invite/:workspaceInviteId/revoke')
    async inviteRevoke(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('workspaceInviteId', { schema: RequestUuidSchema })
        workspaceInviteId: string
    ): Promise<IResponseReturn<void>> {
        return this.workspaceRevokeInviteUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            policyContext,
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
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/invite/claim')
    async inviteClaim(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @Body({ schema: WorkspaceInviteClaimRequestSchema })
        body: WorkspaceInviteClaimRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.workspaceClaimInviteUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            body
        );
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
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/join-request/create')
    async joinRequestCreate(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @Body({ schema: WorkspaceJoinRequestCreateRequestSchema })
        body: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequest>> {
        return this.workspaceCreateJoinRequestUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            body
        );
    }

    @Doc({ summary: 'list join requests for the current workspace' })
    @ResponsePagination('workspace.joinRequest.list', {
        schema: WorkspaceJoinRequestResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceJoinRequest,
        action: [EnumPolicyAction.read],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/join-request/list')
    async joinRequestList(
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Query({ schema: WorkspaceJoinRequestListRequestSchema })
        query: WorkspaceJoinRequestListRequestDto
    ): Promise<IResponsePaginationReturn<WorkspaceJoinRequest>> {
        return this.workspaceGetJoinRequestsListUseCase.execute(
            workspaceContext,
            policyContext,
            query
        );
    }

    @Doc({
        summary:
            'accept a pending join request; creates the requester as a member',
    })
    @Response('workspace.joinRequest.accept')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceJoinRequest,
        action: [EnumPolicyAction.update],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/join-request/:workspaceJoinRequestId/accept')
    async joinRequestAccept(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('workspaceJoinRequestId', { schema: RequestUuidSchema })
        workspaceJoinRequestId: string
    ): Promise<IResponseReturn<void>> {
        return this.workspaceAcceptJoinRequestUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            policyContext,
            workspaceJoinRequestId
        );
    }

    @Doc({ summary: 'reject a pending join request with a reason code' })
    @Response('workspace.joinRequest.reject')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceJoinRequest,
        action: [EnumPolicyAction.update],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/join-request/:workspaceJoinRequestId/reject')
    async joinRequestReject(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('workspaceJoinRequestId', { schema: RequestUuidSchema })
        workspaceJoinRequestId: string,
        @Body({ schema: WorkspaceJoinRequestRejectRequestSchema })
        body: WorkspaceJoinRequestRejectRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.workspaceRejectJoinRequestUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            policyContext,
            workspaceJoinRequestId,
            body
        );
    }
}
