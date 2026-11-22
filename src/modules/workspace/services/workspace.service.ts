import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { WorkspaceSlugRegex } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceOwnerTransferRequiredException } from '@modules/workspace/exceptions/workspace.owner-transfer-required.exception';
import { WorkspaceSlugInvalidException } from '@modules/workspace/exceptions/workspace.slug-invalid.exception';
import type {
    IWorkspaceCreate,
    IWorkspaceOwnedUser,
    IWorkspaceUpdate,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class WorkspaceService {
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly slugMaxAttempts: number;

    constructor(
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly featureFlagService: FeatureFlagService,
        private readonly outboxService: OutboxService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.slugPrefix = this.configService.get<string>(
            'workspace.slugPrefix'
        )!;
        this.slugMaxLength = this.configService.get<number>(
            'workspace.slugMaxLength'
        )!;
        this.slugMaxAttempts = this.configService.get<number>(
            'workspace.slugMaxAttempts'
        )!;
    }

    private isSlugAllowed(slug: string): boolean {
        const isPatternValid = WorkspaceSlugRegex.test(slug);

        return slug.length <= this.slugMaxLength && isPatternValid;
    }

    private async closePendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        updatedBy: string
    ): Promise<void> {
        await Promise.all([
            this.workspaceInviteService.revokePendingByWorkspaceInTx(
                tx,
                workspaceId,
                updatedBy
            ),
            this.workspaceJoinRequestService.cancelPendingByWorkspaceInTx(
                tx,
                workspaceId,
                updatedBy
            ),
        ]);
    }

    drawSlugCandidates(): string[] {
        return this.helperStringService.generateSlugCandidates(
            this.slugPrefix,
            this.slugMaxLength,
            this.slugMaxAttempts
        );
    }

    async getListCursorByMember(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<Workspace>> {
        const workspaceIds =
            await this.workspaceMemberRepository.findWorkspaceIdsByUser(
                userId,
                null
            );

        return this.workspaceRepository.findWithPaginationCursorByMember(
            workspaceIds,
            pagination
        );
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        ownerId: string,
        create: IWorkspaceCreate,
        slug: string,
        workspaceId: string
    ): Promise<Workspace> {
        const workspace = await this.workspaceRepository.createInTx(
            tx,
            ownerId,
            create,
            slug,
            workspaceId
        );
        await this.workspaceMemberRepository.createOwnerInTx(
            tx,
            workspace.id,
            ownerId
        );

        return workspace;
    }

    async createPersonalInTx(
        tx: IDatabaseTransactionClient,
        ownerId: string,
        name: string,
        slug: string,
        workspaceId: string
    ): Promise<Workspace> {
        return this.createInTx(
            tx,
            ownerId,
            { name, description: null, isPublic: null },
            slug,
            workspaceId
        );
    }

    async createOwnedForUsersInTx(
        tx: IDatabaseTransactionClient,
        users: IWorkspaceOwnedUser[]
    ): Promise<void> {
        for (const user of users) {
            await this.createPersonalInTx(
                tx,
                user.userId,
                user.name,
                user.slug,
                user.workspaceId
            );
        }
    }

    async createWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        slug: string,
        create: IWorkspaceCreate
    ): Promise<Workspace> {
        const userId = authContext.userId;
        const workspace = await this.createInTx(
            tx,
            userId,
            create,
            slug,
            workspaceId
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.workspaceCreated,
                userId,
                createdBy: userId,
                workspaceId: workspace.id,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return workspace;
    }

    async updateWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        update: IWorkspaceUpdate
    ): Promise<Workspace> {
        const workspace = await this.workspaceRepository.updateDetailsInTx(
            tx,
            workspaceId,
            update
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.workspaceUpdated,
                userId: authContext.userId,
                createdBy: authContext.userId,
                workspaceId,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return workspace;
    }

    async updateWorkspaceIsPublicInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        isPublic: boolean
    ): Promise<Workspace> {
        const workspace = await this.workspaceRepository.updateIsPublicInTx(
            tx,
            workspaceId,
            isPublic
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.workspaceVisibilityUpdated,
                userId: authContext.userId,
                createdBy: authContext.userId,
                workspaceId,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return workspace;
    }

    async updateWorkspaceSlugInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        slug: string
    ): Promise<Workspace> {
        const workspace = await this.workspaceRepository.updateSlugInTx(
            tx,
            workspaceId,
            slug
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.workspaceUpdated,
                userId: authContext.userId,
                createdBy: authContext.userId,
                workspaceId,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return workspace;
    }

    assertSlugAllowed(slug: string): void {
        const isSlugAllowed = this.isSlugAllowed(slug);
        if (!isSlugAllowed) {
            throw new WorkspaceSlugInvalidException();
        }
    }

    /** Soft-deletes the workspace and closes its pending invites and join requests; returns `false` and closes nothing when the workspace was already deleted. */
    async softDeleteInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<boolean> {
        const softDeleted = await this.workspaceRepository.softDeleteInTx(
            tx,
            workspaceId,
            deletedAt,
            deletedBy
        );
        if (!softDeleted) {
            return false;
        }

        await this.closePendingByWorkspaceInTx(tx, workspaceId, deletedBy);

        return true;
    }

    /** Reads `maxWorkspacesPerUser` and the owner's active workspace count; throws at the cap. */
    async assertOwnedCapAvailable(userId: string): Promise<void> {
        const [maxWorkspacesPerUser, ownedCount] = await Promise.all([
            this.featureFlagService.getMetadataNumber(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.maxWorkspacesPerUser
            ),
            this.workspaceMemberRepository.countOwnedActiveByUser(userId),
        ]);
        if (ownedCount >= maxWorkspacesPerUser) {
            throw new WorkspaceCapReachedException();
        }
    }

    /** Returns the ids of the workspaces the user owns; one with another member throws the owner-transfer-required exception. */
    async getOwnedForSelfDelete(userId: string): Promise<string[]> {
        const workspaceIds =
            await this.workspaceMemberRepository.findWorkspaceIdsByUser(
                userId,
                EnumWorkspaceMemberRole.owner
            );
        const hasOtherMembers =
            await this.workspaceRepository.existsOwnedWithOtherMembers(
                workspaceIds,
                userId
            );
        if (hasOtherMembers) {
            throw new WorkspaceOwnerTransferRequiredException();
        }

        return workspaceIds;
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams,
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<Workspace>> {
        return this.workspaceRepository.findWithPaginationOffsetByAdmin(
            pagination,
            isPublic ?? null
        );
    }

    async getByIdByAdmin(workspaceId: string): Promise<Workspace> {
        const workspace =
            await this.workspaceRepository.findByIdByAdmin(workspaceId);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
    }

    /** Gates on `workspace.joinRequestAllowed` and resolves a live public workspace by slug; a private or deleted one throws the same not-found as an unknown slug. */
    async previewWorkspace(slug: string): Promise<Workspace> {
        const [workspace] = await Promise.all([
            this.workspaceRepository.findActivePublicBySlug(slug),
            this.featureFlagService.validateFeatureFlagMetadata(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.joinRequestAllowed
            ),
        ]);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
    }
}
