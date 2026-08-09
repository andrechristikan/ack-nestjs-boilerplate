import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { HelperService } from '@common/helper/services/helper.service';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { INotificationWorkspaceInvitePayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailUtil } from '@modules/notification/utils/notification.email.util';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import { WorkspaceInviteResponseDto } from '@modules/workspace/dtos/response/workspace.invite.response.dto';
import { WorkspaceJoinRequestResponseDto } from '@modules/workspace/dtos/response/workspace.join-request.response.dto';
import { WorkspaceMemberResponseDto } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import { WorkspacePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.preview.response.dto';
import { WorkspaceResponseDto } from '@modules/workspace/dtos/response/workspace.response.dto';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import { WorkspaceJoinRequestAlreadyMemberException } from '@modules/workspace/exceptions/workspace.join-request-already-member.exception';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestDuplicateException } from '@modules/workspace/exceptions/workspace.join-request-duplicate.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import { WorkspaceRoleForbiddenException } from '@modules/workspace/exceptions/workspace.role-forbidden.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
import { WorkspaceSlugInvalidException } from '@modules/workspace/exceptions/workspace.slug-invalid.exception';
import { IWorkspaceInviteTokenData } from '@modules/workspace/interfaces/workspace.interface';
import { IWorkspaceService } from '@modules/workspace/interfaces/workspace.service.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumActivityLogAction,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
    Prisma,
    Workspace,
    WorkspaceInvite,
    WorkspaceJoinRequest,
    WorkspaceMember,
} from '@generated/prisma-client';
import { Duration } from 'luxon';

@Injectable()
export class WorkspaceService implements IWorkspaceService {
    private readonly maxWorkspacesPerUser: number;
    private readonly slugPattern: RegExp;
    private readonly slugMaxLength: number;

    private readonly homeUrl: string;
    private readonly inviteExpiredInDays: number;
    private readonly inviteTokenLength: number;
    private readonly inviteReferencePrefix: string;
    private readonly inviteReferenceRandomLength: number;
    private readonly inviteLinkBaseUrl: string;
    private readonly joinRequestReviewLinkBaseUrl: string;

    constructor(
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceInviteRepository: WorkspaceInviteRepository,
        private readonly workspaceJoinRequestRepository: WorkspaceJoinRequestRepository,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly helperService: HelperService,
        private readonly requestStoreService: RequestStoreService,
        private readonly configService: ConfigService,
        private readonly notificationUtil: NotificationUtil,
        private readonly notificationEmailUtil: NotificationEmailUtil,
        private readonly featureFlagService: FeatureFlagService
    ) {
        this.maxWorkspacesPerUser = this.configService.get<number>(
            'workspace.maxWorkspacesPerUser'
        )!;
        this.slugPattern = this.configService.get<RegExp>(
            'workspace.slugPattern'
        )!;
        this.slugMaxLength = this.configService.get<number>(
            'workspace.slugMaxLength'
        )!;

        this.homeUrl = this.configService.get<string>('home.url')!;
        this.inviteExpiredInDays = this.configService.get<number>(
            'workspace.invite.expiredInDays'
        )!;
        this.inviteTokenLength = this.configService.get<number>(
            'workspace.invite.tokenLength'
        )!;
        this.inviteReferencePrefix = this.configService.get<string>(
            'workspace.invite.referencePrefix'
        )!;
        this.inviteReferenceRandomLength = this.configService.get<number>(
            'workspace.invite.referenceRandomLength'
        )!;
        this.inviteLinkBaseUrl = this.configService.get<string>(
            'workspace.invite.linkBaseUrl'
        )!;
        this.joinRequestReviewLinkBaseUrl = this.configService.get<string>(
            'workspace.joinRequest.reviewLinkBaseUrl'
        )!;
    }

    private assertSlugAllowed(slug: string): void {
        if (slug.length > this.slugMaxLength || !this.slugPattern.test(slug)) {
            throw new WorkspaceSlugInvalidException();
        }
    }

    private currentRequestLog(): IRequestLog {
        return this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;
    }

    private async assertInvitationAllowed(): Promise<void> {
        await this.featureFlagService.validateFeatureFlagMetadata(
            'workspace',
            'invitationAllowed'
        );
    }

    private async assertJoinRequestAllowed(): Promise<void> {
        await this.featureFlagService.validateFeatureFlagMetadata(
            'workspace',
            'joinRequestAllowed'
        );
    }

    private assertPeerActionAllowed(
        actorMember: WorkspaceMember,
        targetMember: WorkspaceMember
    ): void {
        if (targetMember.role === EnumWorkspaceMemberRole.owner) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        if (
            actorMember.role === EnumWorkspaceMemberRole.admin &&
            targetMember.role === EnumWorkspaceMemberRole.admin
        ) {
            throw new WorkspaceMemberPeerForbiddenException();
        }
    }

    private createInviteTokenData(
        expiryDurationInDays?: number
    ): IWorkspaceInviteTokenData {
        const token = this.helperService.randomString(this.inviteTokenLength);
        const hashedToken = this.helperService.sha256Hash(token);
        const reference = `${this.inviteReferencePrefix}-${this.helperService.randomString(
            this.inviteReferenceRandomLength
        )}`;
        const expiredAt = this.helperService.dateForward(
            this.helperService.dateCreate(),
            Duration.fromObject({
                days: expiryDurationInDays ?? this.inviteExpiredInDays,
            })
        );
        const link = `${this.homeUrl}/${this.inviteLinkBaseUrl}/${token}`;

        return { token, hashedToken, reference, expiredAt, link };
    }

    private async sendInviteNotification(
        workspace: Workspace,
        invite: WorkspaceInvite,
        tokenData: IWorkspaceInviteTokenData,
        actorId: string
    ): Promise<void> {
        const [inviter, existingUser] = await Promise.all([
            this.workspaceInviteRepository.findInviterNameById(actorId),
            this.workspaceInviteRepository.findActiveUserByEmail(invite.email),
        ]);
        const inviterName =
            inviter?.name ?? inviter?.username ?? workspace.name;

        const payloadBase: Omit<
            INotificationWorkspaceInvitePayload,
            'encryptedInviteAcceptLink'
        > = {
            workspaceId: invite.workspaceId,
            workspaceName: workspace.name,
            inviterName,
            workspaceMemberRole: invite.workspaceRole,
            reference: invite.reference,
            expiredAt: this.helperService.dateFormatToIso(invite.expiredAt),
        };

        if (existingUser) {
            // @note: swap in UserUtil.encryptedLink and importing UserModule cycles back.
            const encryptedInviteAcceptLink =
                this.helperService.aes256EncryptSimple(
                    tokenData.link,
                    existingUser.id
                );

            await this.notificationUtil.sendWorkspaceInvite(
                existingUser.id,
                { ...payloadBase, encryptedInviteAcceptLink },
                actorId
            );

            return;
        }

        const encryptedInviteAcceptLink =
            this.helperService.aes256EncryptSimple(
                tokenData.link,
                invite.reference
            );

        await this.notificationEmailUtil.sendWorkspaceInviteUnregistered(
            invite.email,
            { ...payloadBase, encryptedInviteAcceptLink }
        );
    }

    private async sendJoinRequestNotifications(
        workspace: Workspace,
        joinRequest: WorkspaceJoinRequest,
        requesterId: string
    ): Promise<void> {
        const [requester, reviewers] = await Promise.all([
            this.workspaceJoinRequestRepository.findRequesterNameById(
                requesterId
            ),
            this.workspaceMemberRepository.findReviewersByWorkspace(
                workspace.id
            ),
        ]);
        const requesterName =
            requester?.name ?? requester?.username ?? 'A user';
        const link = `${this.homeUrl}/${this.joinRequestReviewLinkBaseUrl}/${joinRequest.id}`;

        await Promise.all(
            reviewers.map(reviewer => {
                // @note: hoist this out of the loop and every reviewer but the first fails decrypt.
                const encryptedJoinRequestReviewLink =
                    this.helperService.aes256EncryptSimple(
                        link,
                        reviewer.userId
                    );

                return this.notificationUtil.sendWorkspaceJoinRequest(
                    reviewer.userId,
                    {
                        workspaceId: workspace.id,
                        workspaceName: workspace.name,
                        requesterName,
                        encryptedJoinRequestReviewLink,
                    },
                    requesterId
                );
            })
        );
    }

    private async validatePendingJoinRequest(
        workspaceJoinRequestId: string,
        workspaceId: string
    ): Promise<WorkspaceJoinRequest> {
        const joinRequest =
            await this.workspaceJoinRequestRepository.findByIdAndWorkspace(
                workspaceJoinRequestId,
                workspaceId
            );
        if (!joinRequest) {
            throw new WorkspaceJoinRequestNotFoundException();
        } else if (
            joinRequest.status !== EnumWorkspaceJoinRequestStatus.pending
        ) {
            throw new WorkspaceJoinRequestAlreadyProcessedException();
        }

        return joinRequest;
    }

    async validateWorkspaceGuard(
        workspaceId: string | null
    ): Promise<Workspace> {
        if (!workspaceId) {
            throw new WorkspaceNotFoundException();
        }

        const workspace =
            await this.workspaceRepository.findActiveById(workspaceId);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
    }

    async validateWorkspaceMemberGuard(
        workspaceId: string | null,
        userId: string | null
    ): Promise<WorkspaceMember> {
        if (!userId) {
            throw new AuthJwtAccessTokenInvalidException();
        } else if (!workspaceId) {
            throw new WorkspaceNotFoundException();
        }

        const member =
            await this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                workspaceId,
                userId
            );
        if (!member) {
            throw new WorkspaceMemberForbiddenException();
        }

        return member;
    }

    validateWorkspaceRoleGuard(
        member: WorkspaceMember | null,
        allowedRoles: EnumWorkspaceMemberRole[]
    ): WorkspaceMember {
        if (!member) {
            throw new WorkspaceRoleForbiddenException();
        }

        // @note: fold this into allowedRoles and every @WorkspaceMemberProtected(admin) route rejects the owner.
        if (member.role === EnumWorkspaceMemberRole.owner) {
            return member;
        }

        if (!allowedRoles.includes(member.role)) {
            throw new WorkspaceRoleForbiddenException();
        }

        return member;
    }

    async validateInviteToken(token: string): Promise<WorkspaceInvite> {
        const hashedToken = this.helperService.sha256Hash(token);
        const invite =
            await this.workspaceInviteRepository.findPendingByHashedToken(
                hashedToken
            );
        if (!invite) {
            throw new WorkspaceInviteInvalidException();
        }

        return invite;
    }

    async getListForMember(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceSelect,
            Prisma.WorkspaceWhereInput
        >
    ): Promise<IResponsePagingReturn<WorkspaceResponseDto>> {
        const { data, ...others } =
            await this.workspaceRepository.findWithPaginationOffsetByMember(
                userId,
                pagination
            );

        return {
            data: this.workspaceUtil.mapList(data),
            ...others,
        };
    }

    async createWorkspace(
        userId: string,
        dto: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        const requestLog = this.currentRequestLog();

        if (dto.slug) {
            this.assertSlugAllowed(dto.slug);
        }

        const [ownedCount, slugTaken] = await Promise.all([
            this.workspaceMemberRepository.countOwnedActiveByUser(userId),
            dto.slug
                ? this.workspaceRepository.existsBySlug(dto.slug)
                : false,
        ]);
        if (ownedCount >= this.maxWorkspacesPerUser) {
            throw new WorkspaceCapReachedException();
        } else if (slugTaken) {
            throw new WorkspaceSlugAlreadyExistsException();
        }

        const workspace = await this.workspaceRepository.createWithOwner(
            userId,
            dto,
            requestLog
        );

        return { data: this.workspaceUtil.mapOne(workspace) };
    }

    getCurrentWorkspace(
        workspace: Workspace
    ): IResponseReturn<WorkspaceResponseDto> {
        return { data: this.workspaceUtil.mapOne(workspace) };
    }

    async updateWorkspace(
        workspaceId: string,
        actorId: string,
        dto: WorkspaceUpdateRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        const requestLog = this.currentRequestLog();

        const workspace = await this.workspaceRepository.updateDetails(
            workspaceId,
            actorId,
            dto,
            requestLog
        );

        return { data: this.workspaceUtil.mapOne(workspace) };
    }

    async updateWorkspaceIsPublic(
        workspaceId: string,
        actorId: string,
        isPublic: boolean
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        const requestLog = this.currentRequestLog();

        const workspace = await this.workspaceRepository.updateIsPublic(
            workspaceId,
            actorId,
            isPublic,
            requestLog
        );

        return { data: this.workspaceUtil.mapOne(workspace) };
    }

    async updateWorkspaceSlug(
        workspaceId: string,
        actorId: string,
        slug: string
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        const requestLog = this.currentRequestLog();

        this.assertSlugAllowed(slug);

        const slugTaken = await this.workspaceRepository.existsBySlug(
            slug,
            workspaceId
        );
        if (slugTaken) {
            throw new WorkspaceSlugAlreadyExistsException();
        }

        const workspace = await this.workspaceRepository.updateSlug(
            workspaceId,
            actorId,
            slug,
            requestLog
        );

        return { data: this.workspaceUtil.mapOne(workspace) };
    }

    async switchWorkspace(userId: string, workspaceId: string): Promise<void> {
        const requestLog = this.currentRequestLog();

        await this.validateWorkspaceGuard(workspaceId);
        await this.validateWorkspaceMemberGuard(workspaceId, userId);

        await this.workspaceRepository.switchForUser(
            userId,
            workspaceId,
            requestLog
        );
    }

    async transferOwnership(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetUserId: string
    ): Promise<void> {
        const requestLog = this.currentRequestLog();

        if (targetUserId === actorMember.userId) {
            throw new WorkspaceSelfTransferException();
        }

        const targetMember =
            await this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                workspaceId,
                targetUserId
            );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        await this.workspaceMemberRepository.transferOwnership(
            workspaceId,
            actorMember.id,
            targetMember.id,
            actorMember.userId,
            requestLog
        );
    }

    async leaveWorkspace(
        workspaceId: string,
        member: WorkspaceMember
    ): Promise<void> {
        const requestLog = this.currentRequestLog();

        if (member.role === EnumWorkspaceMemberRole.owner) {
            const ownerCount =
                await this.workspaceMemberRepository.countOwners(workspaceId);
            if (ownerCount <= 1) {
                throw new WorkspaceLastOwnerException();
            }
        }

        await this.workspaceMemberRepository.removeMember(
            workspaceId,
            member.userId,
            member.id,
            EnumActivityLogAction.workspaceMemberLeft,
            requestLog
        );
    }

    async softDeleteWorkspace(
        workspaceId: string,
        actorId: string
    ): Promise<void> {
        const requestLog = this.currentRequestLog();

        await this.workspaceRepository.softDelete(
            workspaceId,
            actorId,
            requestLog
        );
    }

    async getMembersList(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceMemberSelect,
            Prisma.WorkspaceMemberWhereInput
        >,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceMemberResponseDto>> {
        const { data, ...others } =
            await this.workspaceMemberRepository.findWithPaginationOffset(
                workspaceId,
                pagination,
                role
            );

        return {
            data: this.workspaceUtil.mapMemberList(data),
            ...others,
        };
    }

    async updateMemberRole(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string,
        newRole: EnumWorkspaceMemberRole
    ): Promise<void> {
        const requestLog = this.currentRequestLog();

        const targetMember =
            await this.workspaceMemberRepository.findByIdAndWorkspace(
                targetMemberId,
                workspaceId
            );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        this.assertPeerActionAllowed(actorMember, targetMember);

        await this.workspaceMemberRepository.updateRole(
            workspaceId,
            actorMember.userId,
            targetMember.id,
            newRole,
            requestLog
        );
    }

    async removeMember(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string
    ): Promise<void> {
        const requestLog = this.currentRequestLog();

        const targetMember =
            await this.workspaceMemberRepository.findByIdAndWorkspace(
                targetMemberId,
                workspaceId
            );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        if (targetMember.userId === actorMember.userId) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        this.assertPeerActionAllowed(actorMember, targetMember);

        await this.workspaceMemberRepository.removeMember(
            workspaceId,
            actorMember.userId,
            targetMember.id,
            EnumActivityLogAction.workspaceMemberRemoved,
            requestLog
        );
    }

    async getListForAdmin(
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceSelect,
            Prisma.WorkspaceWhereInput
        >,
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<WorkspaceResponseDto>> {
        const { data, ...others } =
            await this.workspaceRepository.findWithPaginationOffsetForAdmin(
                pagination,
                isPublic
            );

        return {
            data: this.workspaceUtil.mapList(data),
            ...others,
        };
    }

    async getByIdForAdmin(
        workspaceId: string
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        const workspace =
            await this.workspaceRepository.findByIdForAdmin(workspaceId);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return { data: this.workspaceUtil.mapOne(workspace) };
    }

    async getMembersListForAdmin(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceMemberSelect,
            Prisma.WorkspaceMemberWhereInput
        >
    ): Promise<IResponsePagingReturn<WorkspaceMemberResponseDto>> {
        const [workspace, paginated] = await Promise.all([
            this.workspaceRepository.findByIdForAdmin(workspaceId),
            this.workspaceMemberRepository.findWithPaginationOffset(
                workspaceId,
                pagination
            ),
        ]);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        const { data, ...others } = paginated;

        return {
            data: this.workspaceUtil.mapMemberList(data),
            ...others,
        };
    }

    async getInvitesList(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceInviteSelect,
            Prisma.WorkspaceInviteWhereInput
        >,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceInviteResponseDto>> {
        await this.assertInvitationAllowed();

        const { data, ...others } =
            await this.workspaceInviteRepository.findWithPaginationOffset(
                workspaceId,
                pagination,
                status
            );

        return {
            data: this.workspaceUtil.mapInviteList(data),
            ...others,
        };
    }

    async createInvite(
        workspace: Workspace,
        actorId: string,
        dto: WorkspaceInviteCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceInviteResponseDto>> {
        await this.assertInvitationAllowed();

        const requestLog = this.currentRequestLog();

        const hasProjectId = !!dto.projectId;
        const hasProjectRole = !!dto.projectRole;
        if (hasProjectId !== hasProjectRole) {
            throw new WorkspaceInviteRoleRequiredException();
        }

        const [project, duplicate] = await Promise.all([
            dto.projectId
                ? this.workspaceInviteRepository.findActiveProjectByIdAndWorkspace(
                      dto.projectId,
                      workspace.id
                  )
                : null,
            this.workspaceInviteRepository.existsPendingByWorkspaceAndEmail(
                workspace.id,
                dto.email
            ),
        ]);
        if (dto.projectId && !project) {
            throw new WorkspaceInviteProjectMismatchException();
        } else if (duplicate) {
            throw new WorkspaceInviteDuplicateException();
        }

        const tokenData = this.createInviteTokenData(dto.expiryDuration);

        const invite = await this.workspaceInviteRepository.createPending(
            {
                workspaceId: workspace.id,
                email: dto.email,
                workspaceRole: dto.workspaceRole,
                projectId: dto.projectId,
                projectRole: dto.projectRole,
                hashedToken: tokenData.hashedToken,
                reference: tokenData.reference,
                expiredAt: tokenData.expiredAt,
                invitedByUserId: actorId,
            },
            requestLog
        );

        await this.sendInviteNotification(
            workspace,
            invite,
            tokenData,
            actorId
        );

        return { data: this.workspaceUtil.mapInvite(invite) };
    }

    async resendInvite(
        workspace: Workspace,
        actorId: string,
        workspaceInviteId: string
    ): Promise<IResponseReturn<WorkspaceInviteResponseDto>> {
        await this.assertInvitationAllowed();

        const existing =
            await this.workspaceInviteRepository.findByIdAndWorkspace(
                workspaceInviteId,
                workspace.id
            );
        if (!existing) {
            throw new WorkspaceInviteNotFoundException();
        } else if (existing.status !== EnumWorkspaceInviteStatus.pending) {
            throw new WorkspaceInviteAlreadyProcessedException();
        }

        const tokenData = this.createInviteTokenData();

        const invite = await this.workspaceInviteRepository.rotateForResend(
            workspaceInviteId,
            actorId,
            tokenData.hashedToken,
            tokenData.reference,
            tokenData.expiredAt
        );

        await this.sendInviteNotification(
            workspace,
            invite,
            tokenData,
            actorId
        );

        return { data: this.workspaceUtil.mapInvite(invite) };
    }

    async revokeInvite(
        workspaceId: string,
        actorId: string,
        workspaceInviteId: string
    ): Promise<void> {
        await this.assertInvitationAllowed();

        const requestLog = this.currentRequestLog();

        const existing =
            await this.workspaceInviteRepository.findByIdAndWorkspace(
                workspaceInviteId,
                workspaceId
            );
        if (!existing) {
            throw new WorkspaceInviteNotFoundException();
        } else if (existing.status !== EnumWorkspaceInviteStatus.pending) {
            throw new WorkspaceInviteAlreadyProcessedException();
        }

        await this.workspaceInviteRepository.revoke(
            workspaceInviteId,
            workspaceId,
            actorId,
            requestLog
        );
    }

    async claimInvite(
        userId: string,
        userEmail: string,
        inviteToken: string
    ): Promise<void> {
        await this.assertInvitationAllowed();

        const requestLog = this.currentRequestLog();

        const invite = await this.validateInviteToken(inviteToken);
        if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
            throw new WorkspaceInviteInvalidException();
        }

        // @note: without this, a repeat claim hits the workspaceId+userId unique constraint raw.
        const existingMember =
            await this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                invite.workspaceId,
                userId
            );
        if (existingMember) {
            throw new WorkspaceInviteInvalidException();
        }

        await this.workspaceInviteRepository.acceptForExistingUser(
            userId,
            invite,
            invite.workspaceRole,
            requestLog
        );
    }

    async previewInvite(
        inviteToken: string
    ): Promise<IResponseReturn<WorkspaceInvitePreviewResponseDto>> {
        await this.assertInvitationAllowed();

        const invite = await this.validateInviteToken(inviteToken);

        const [workspace, inviter] = await Promise.all([
            this.workspaceRepository.findActiveById(invite.workspaceId),
            this.workspaceInviteRepository.findInviterNameById(
                invite.invitedByUserId
            ),
        ]);
        if (!workspace) {
            throw new WorkspaceInviteInvalidException();
        }

        return {
            data: this.workspaceUtil.mapInvitePreview(
                workspace,
                invite,
                inviter
            ),
        };
    }

    async previewWorkspace(
        slug: string
    ): Promise<IResponseReturn<WorkspacePreviewResponseDto>> {
        await this.assertJoinRequestAllowed();

        const workspace =
            await this.workspaceRepository.findActivePublicBySlug(slug);
        // @note: split this into a 403 for "exists but private" and the slug becomes probeable.
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return { data: this.workspaceUtil.mapPreview(workspace) };
    }

    async createJoinRequest(
        userId: string,
        dto: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequestResponseDto>> {
        await this.assertJoinRequestAllowed();

        const requestLog = this.currentRequestLog();

        const workspace = await this.workspaceRepository.findActiveById(
            dto.workspaceId
        );
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        } else if (!workspace.isPublic) {
            throw new WorkspaceNotPublicException();
        }

        const [existingMember, duplicate] = await Promise.all([
            this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                workspace.id,
                userId
            ),
            this.workspaceJoinRequestRepository.existsPendingByWorkspaceAndUser(
                workspace.id,
                userId
            ),
        ]);
        if (existingMember) {
            throw new WorkspaceJoinRequestAlreadyMemberException();
        } else if (duplicate) {
            throw new WorkspaceJoinRequestDuplicateException();
        }

        const joinRequest =
            await this.workspaceJoinRequestRepository.createPending(
                {
                    workspaceId: workspace.id,
                    userId,
                    message: dto.message,
                },
                requestLog
            );

        await this.sendJoinRequestNotifications(workspace, joinRequest, userId);

        return { data: this.workspaceUtil.mapJoinRequest(joinRequest) };
    }

    async getJoinRequestsList(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceJoinRequestSelect,
            Prisma.WorkspaceJoinRequestWhereInput
        >,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceJoinRequestResponseDto>> {
        await this.assertJoinRequestAllowed();

        const { data, ...others } =
            await this.workspaceJoinRequestRepository.findWithPaginationOffset(
                workspaceId,
                pagination,
                status
            );

        return {
            data: this.workspaceUtil.mapJoinRequestList(data),
            ...others,
        };
    }

    async acceptJoinRequest(
        workspace: Workspace,
        reviewerId: string,
        workspaceJoinRequestId: string
    ): Promise<void> {
        await this.assertJoinRequestAllowed();

        const requestLog = this.currentRequestLog();

        const joinRequest = await this.validatePendingJoinRequest(
            workspaceJoinRequestId,
            workspace.id
        );

        await this.workspaceJoinRequestRepository.acceptForRequester(
            joinRequest,
            reviewerId,
            requestLog
        );

        await this.notificationUtil.sendWorkspaceJoinAccepted(
            joinRequest.userId,
            {
                workspaceId: workspace.id,
                workspaceName: workspace.name,
            },
            reviewerId
        );
    }

    async rejectJoinRequest(
        workspace: Workspace,
        reviewerId: string,
        workspaceJoinRequestId: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason
    ): Promise<void> {
        await this.assertJoinRequestAllowed();

        const requestLog = this.currentRequestLog();

        const joinRequest = await this.validatePendingJoinRequest(
            workspaceJoinRequestId,
            workspace.id
        );

        await this.workspaceJoinRequestRepository.rejectForRequester(
            workspaceJoinRequestId,
            workspace.id,
            reviewerId,
            rejectReasonCode,
            requestLog
        );

        await this.notificationUtil.sendWorkspaceJoinRejected(
            joinRequest.userId,
            {
                workspaceId: workspace.id,
                workspaceName: workspace.name,
                rejectReasonCode,
            },
            reviewerId
        );
    }
}
