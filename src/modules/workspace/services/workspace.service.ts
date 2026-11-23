import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleService } from '@modules/role/services/role.service';
import type { Prisma } from '@generated/prisma-client/client';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.enum';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceHeaderMissingException } from '@modules/workspace/exceptions/workspace.header-missing.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceOwnerTransferRequiredException } from '@modules/workspace/exceptions/workspace.owner-transfer-required.exception';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
import { WorkspaceSlugInvalidException } from '@modules/workspace/exceptions/workspace.slug-invalid.exception';
import type {
    IWorkspaceCreate,
    IWorkspaceOwnedUser,
    IWorkspaceUpdate,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class WorkspaceService {
    private readonly slugRegex: RegExp;
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly slugMaxAttempts: number;

    constructor(
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly featureFlagService: FeatureFlagService,
        private readonly roleService: RoleService,
        private readonly outboxService: OutboxService,
        private readonly activityLogService: ActivityLogService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.slugRegex = this.configService.get<RegExp>('workspace.slugRegex')!;
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

    private drawSlugCandidates(): string[] {
        return this.helperStringService.generateSlugCandidates(
            this.slugPrefix,
            this.slugMaxLength,
            this.slugMaxAttempts
        );
    }

    private isSlugAllowed(slug: string): boolean {
        const isPatternValid = this.slugRegex.test(slug);

        return slug.length <= this.slugMaxLength && isPatternValid;
    }

    private async createWithOwnerRoleInTx(
        tx: IDatabaseTransactionClient,
        ownerRoleId: string,
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
            ownerId,
            ownerRoleId
        );

        return workspace;
    }

    async validateWorkspaceGuard(
        workspaceId: string | null
    ): Promise<Workspace> {
        if (!workspaceId) {
            throw new WorkspaceHeaderMissingException();
        }

        const workspace =
            await this.workspaceRepository.findActiveById(workspaceId);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
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
        const ownerRole = await this.roleService.getRefByScopeAndKeyInTx(
            tx,
            EnumRoleScope.workspace,
            EnumRoleWorkspaceKey.owner
        );

        return this.createWithOwnerRoleInTx(
            tx,
            ownerRole.id,
            ownerId,
            create,
            slug,
            workspaceId
        );
    }

    async createOwnedForUsersInTx(
        tx: IDatabaseTransactionClient,
        users: IWorkspaceOwnedUser[]
    ): Promise<void> {
        const ownerRole = await this.roleService.getRefByScopeAndKeyInTx(
            tx,
            EnumRoleScope.workspace,
            EnumRoleWorkspaceKey.owner
        );

        for (const user of users) {
            await this.createWithOwnerRoleInTx(
                tx,
                ownerRole.id,
                user.userId,
                { name: user.name, description: null, isPublic: null },
                user.slug,
                user.workspaceId
            );
        }
    }

    /** Creates the workspace with its owner row and adds the creator's activity entry in one transaction per slug attempt, dispatched after the commit. */
    async createWorkspace(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        create: IWorkspaceCreate
    ): Promise<Workspace> {
        const userId = authContext.userId;
        const maxWorkspacesPerUser =
            await this.featureFlagService.getMetadataNumber(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.maxWorkspacesPerUser
            );
        const slugCandidates = this.drawSlugCandidates();

        for (const slug of slugCandidates) {
            const workspaceId = this.databaseUtil.createId();

            try {
                return await this.outboxService.withTransaction(async tx => {
                    const ownedCount = await this.countOwnedInTx(tx, userId);
                    if (ownedCount >= maxWorkspacesPerUser) {
                        throw new WorkspaceCapReachedException();
                    }

                    const workspace = await this.createInTx(
                        tx,
                        userId,
                        create,
                        slug,
                        workspaceId
                    );
                    const entry = this.activityLogService.recordEffect(
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
                });
            } catch (error: unknown) {
                const isSlugCollision = this.databaseUtil.isUniqueCollision(
                    error,
                    'slug'
                );
                if (!isSlugCollision) {
                    if (error instanceof AppBaseException) {
                        throw error;
                    }

                    throw new AppUnknownException(error);
                }
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    /** Writes the details and adds the actor's activity entry in one transaction, dispatched after the commit. */
    async updateWorkspace(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        update: IWorkspaceUpdate
    ): Promise<Workspace> {
        return this.outboxService.withTransaction(async tx => {
            const workspace = await this.workspaceRepository.updateDetailsInTx(
                tx,
                workspaceId,
                update
            );
            const entry = this.activityLogService.recordEffect(
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
        });
    }

    /** Writes the visibility and adds the actor's activity entry in one transaction, dispatched after the commit. */
    async updateWorkspaceIsPublic(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        isPublic: boolean
    ): Promise<Workspace> {
        return this.outboxService.withTransaction(async tx => {
            const workspace = await this.workspaceRepository.updateIsPublicInTx(
                tx,
                workspaceId,
                isPublic
            );
            const entry = this.activityLogService.recordEffect(
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
        });
    }

    /** Writes the slug and adds the actor's activity entry in one transaction, dispatched after the commit. */
    async updateWorkspaceSlug(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        slug: string
    ): Promise<Workspace> {
        const isSlugAllowed = this.isSlugAllowed(slug);
        if (!isSlugAllowed) {
            throw new WorkspaceSlugInvalidException();
        }

        try {
            return await this.outboxService.withTransaction(async tx => {
                const workspace = await this.workspaceRepository.updateSlugInTx(
                    tx,
                    workspaceId,
                    slug
                );
                const entry = this.activityLogService.recordEffect(
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
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isSlugCollision = this.databaseUtil.isUniqueCollision(
                err,
                'slug'
            );
            if (isSlugCollision) {
                throw new WorkspaceSlugAlreadyExistsException();
            }

            throw new AppUnknownException(err);
        }
    }

    async softDeleteInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<void> {
        const softDeleted = await this.workspaceRepository.softDeleteInTx(
            tx,
            workspaceId,
            deletedAt,
            deletedBy
        );
        if (!softDeleted) {
            throw new WorkspaceNotFoundException();
        }
    }

    async countOwnedInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number> {
        const workspaceIds =
            await this.workspaceMemberRepository.findWorkspaceIdsByUserInTx(
                tx,
                userId,
                EnumRoleWorkspaceKey.owner
            );

        return this.workspaceRepository.countByOwnerInTx(tx, workspaceIds);
    }

    async assertOwnedHasNoOtherMembersInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        const workspaceIds =
            await this.workspaceMemberRepository.findWorkspaceIdsByUserInTx(
                tx,
                userId,
                EnumRoleWorkspaceKey.owner
            );
        const hasOtherMembers =
            await this.workspaceRepository.existsOwnedWithOtherMembersInTx(
                tx,
                workspaceIds,
                userId
            );
        if (hasOtherMembers) {
            throw new WorkspaceOwnerTransferRequiredException();
        }
    }

    async softDeleteOwnedByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deletedAt: Date
    ): Promise<string[]> {
        const workspaceIds =
            await this.workspaceMemberRepository.findWorkspaceIdsByUserInTx(
                tx,
                userId,
                EnumRoleWorkspaceKey.owner
            );

        return this.workspaceRepository.softDeleteOwnedByUserInTx(
            tx,
            workspaceIds,
            userId,
            deletedAt
        );
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams,
        isPublic: Record<string, IPaginationEqual> | null,
        additionalWhere: Prisma.WorkspaceWhereInput | null
    ): Promise<IResponsePaginationReturn<Workspace>> {
        return this.workspaceRepository.findWithPaginationOffsetByAdmin(
            pagination,
            isPublic,
            additionalWhere
        );
    }

    async getByIdByAdmin(
        workspaceId: string,
        additionalWhere: Prisma.WorkspaceWhereInput | null
    ): Promise<Workspace> {
        const workspace = await this.workspaceRepository.findByIdByAdmin(
            workspaceId,
            additionalWhere
        );
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
    }

    /** Gates on `workspace.joinRequestAllowed`, then resolves a live public workspace by slug; a private or deleted one throws the same not-found as an unknown slug. */
    async previewWorkspace(slug: string): Promise<Workspace> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.joinRequestAllowed
        );
        const workspace =
            await this.workspaceRepository.findActivePublicBySlug(slug);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
    }
}
