import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    Prisma,
    Workspace,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import {
    IUser,
    IUserCreateWithWorkspaceInput,
} from '@modules/user/interfaces/user.interface';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
import { WorkspaceSlugInvalidException } from '@modules/workspace/exceptions/workspace.slug-invalid.exception';
import {
    IWorkspaceCreate,
    IWorkspaceOwnedUser,
    IWorkspaceUpdate,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceDomain {
    private readonly maxWorkspacesPerUser: number;
    private readonly slugRegex: RegExp;
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly slugMaxAttempts: number;

    constructor(
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceInviteRepository: WorkspaceInviteRepository,
        private readonly workspaceJoinRequestRepository: WorkspaceJoinRequestRepository,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly projectDomain: ProjectDomain,
        private readonly userDomain: UserDomain,
        private readonly userOnboardingDomain: UserOnboardingDomain,
        private readonly userOnboardingUtil: UserOnboardingUtil,
        private readonly userVerificationDomain: UserVerificationDomain,
        private readonly userTwoFactorDomain: UserTwoFactorDomain,
        private readonly passwordHistoryDomain: PasswordHistoryDomain,
        private readonly notificationDomain: NotificationDomain,
        private readonly termPolicyAcceptanceDomain: TermPolicyAcceptanceDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly requestStoreService: RequestStoreService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService,
        private readonly featureFlagDomain: FeatureFlagDomain
    ) {
        this.maxWorkspacesPerUser = this.configService.get<number>(
            'workspace.maxWorkspacesPerUser'
        )!;
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
        return Array.from({ length: this.slugMaxAttempts }, () =>
            this.helperStringService.generateSlug(
                this.slugPrefix,
                this.slugMaxLength
            )
        );
    }

    private assertSlugAllowed(slug: string): void {
        if (slug.length > this.slugMaxLength || !this.slugRegex.test(slug)) {
            throw new WorkspaceSlugInvalidException();
        }
    }

    private async assertJoinRequestAllowed(): Promise<void> {
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            'workspace',
            'joinRequestAllowed'
        );
    }

    private buildOwnedUsers(
        inputs: IUserCreateWithWorkspaceInput[],
        slugAttempt: number
    ): IWorkspaceOwnedUser[] {
        return inputs.flatMap(input => {
            if (
                input.workspaceContext.type !==
                EnumUserSignUpWorkspaceContextType.personal
            ) {
                return [];
            }

            return [
                {
                    userId: input.userId,
                    workspaceId: input.workspaceContext.workspaceId,
                    name: input.workspaceContext.name,
                    slug: input.workspaceContext.slugCandidates[slugAttempt],
                },
            ];
        });
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

    async getListForMember(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>
    ): Promise<IResponsePagingReturn<Workspace>> {
        return this.workspaceRepository.findWithPaginationCursorByMember(
            userId,
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
        return this.createInTx(tx, ownerId, { name }, slug, workspaceId);
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

    async commitOnboarding(
        inputs: IUserCreateWithWorkspaceInput[],
        mode: EnumUserCreateMode,
        timeoutInMs: number
    ): Promise<IUser[]> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;
        const slugAttemptCount = inputs.reduce((min, input) => {
            if (
                input.workspaceContext.type !==
                EnumUserSignUpWorkspaceContextType.personal
            ) {
                return min;
            }

            return Math.min(min, input.workspaceContext.slugCandidates.length);
        }, Number.POSITIVE_INFINITY);
        const attempts = Number.isFinite(slugAttemptCount)
            ? slugAttemptCount
            : 1;

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                return await this.databaseService.client.$transaction(
                    async tx => {
                        const users =
                            await this.userOnboardingDomain.createManyInTx(
                                tx,
                                inputs
                            );
                        const onboarded: IUser[] = [];

                        for (const [index, input] of inputs.entries()) {
                            if (input.password && input.passwordHistoryType) {
                                await this.passwordHistoryDomain.createInTx(
                                    tx,
                                    input.userId,
                                    input.password.passwordHash,
                                    input.passwordHistoryType,
                                    input.password.passwordPeriodExpired,
                                    input.password.passwordCreated,
                                    input.createdBy
                                );
                            }

                            await this.notificationDomain.createDefaultsInTx(
                                tx,
                                input.userId
                            );

                            if (input.verification) {
                                await this.userVerificationDomain.createFromOnboardingInTx(
                                    tx,
                                    input.userId,
                                    input.verification,
                                    input.createdBy
                                );
                            }

                            const twoFactor =
                                await this.userTwoFactorDomain.createDisabledInTx(
                                    tx,
                                    input.userId,
                                    input.createdBy
                                );
                            onboarded.push({ ...users[index], twoFactor });
                        }

                        await this.createOwnedForUsersInTx(
                            tx,
                            this.buildOwnedUsers(inputs, attempt)
                        );

                        for (const input of inputs) {
                            if (
                                input.workspaceContext.type ===
                                EnumUserSignUpWorkspaceContextType.invite
                            ) {
                                await this.workspaceInviteDomain.acceptOnSignUpInTx(
                                    tx,
                                    input.userId,
                                    input.workspaceContext
                                );
                            }

                            await this.termPolicyAcceptanceDomain.acceptPublishedInTx(
                                tx,
                                input.userId,
                                input.acceptedTermPolicyTypes,
                                input.createdBy
                            );

                            for (const activity of this.userOnboardingDomain.buildOnboardingActivities(
                                mode,
                                input.workspaceContext
                            )) {
                                await this.activityLogDomain.recordInTx(
                                    tx,
                                    input.createdBy,
                                    activity.action,
                                    requestLog,
                                    activity.workspaceId
                                );
                            }
                        }

                        return onboarded;
                    },
                    { timeout: timeoutInMs }
                );
            } catch (error: unknown) {
                if (this.databaseUtil.isUniqueCollision(error, 'slug')) {
                    continue;
                }

                throw this.userOnboardingUtil.mapCreateCollision(error);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    async createWorkspace(
        userId: string,
        create: IWorkspaceCreate
    ): Promise<Workspace> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const ownedCount =
            await this.workspaceMemberRepository.countOwnedActiveByUser(userId);
        if (ownedCount >= this.maxWorkspacesPerUser) {
            throw new WorkspaceCapReachedException();
        }

        const slugCandidates = this.drawSlugCandidates();

        for (const slug of slugCandidates) {
            const workspaceId = this.databaseUtil.createId();

            try {
                return await this.databaseService.client.$transaction(
                    async tx => {
                        const workspace = await this.createInTx(
                            tx,
                            userId,
                            create,
                            slug,
                            workspaceId
                        );
                        await this.activityLogDomain.recordInTx(
                            tx,
                            userId,
                            EnumActivityLogAction.workspaceCreated,
                            requestLog,
                            workspace.id
                        );

                        return workspace;
                    }
                );
            } catch (error: unknown) {
                if (!this.databaseUtil.isUniqueCollision(error, 'slug')) {
                    throw error;
                }
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    getCurrentWorkspace(workspace: Workspace): Workspace {
        return workspace;
    }

    async updateWorkspace(
        workspaceId: string,
        actorId: string,
        update: IWorkspaceUpdate
    ): Promise<Workspace> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        return this.databaseService.client.$transaction(async tx => {
            const row = await this.workspaceRepository.updateDetailsInTx(
                tx,
                workspaceId,
                actorId,
                update
            );
            await this.activityLogDomain.recordInTx(
                tx,
                actorId,
                EnumActivityLogAction.workspaceUpdated,
                requestLog,
                workspaceId
            );

            return row;
        });
    }

    async updateWorkspaceIsPublic(
        workspaceId: string,
        actorId: string,
        isPublic: boolean
    ): Promise<Workspace> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        return this.databaseService.client.$transaction(async tx => {
            const row = await this.workspaceRepository.updateIsPublicInTx(
                tx,
                workspaceId,
                actorId,
                isPublic
            );
            await this.activityLogDomain.recordInTx(
                tx,
                actorId,
                EnumActivityLogAction.workspaceVisibilityUpdated,
                requestLog,
                workspaceId
            );

            return row;
        });
    }

    async updateWorkspaceSlug(
        workspaceId: string,
        actorId: string,
        slug: string
    ): Promise<Workspace> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        this.assertSlugAllowed(slug);

        const slugTaken = await this.workspaceRepository.existsBySlug(
            slug,
            workspaceId
        );
        if (slugTaken) {
            throw new WorkspaceSlugAlreadyExistsException();
        }

        return this.databaseService.client.$transaction(async tx => {
            const row = await this.workspaceRepository.updateSlugInTx(
                tx,
                workspaceId,
                actorId,
                slug
            );
            await this.activityLogDomain.recordInTx(
                tx,
                actorId,
                EnumActivityLogAction.workspaceUpdated,
                requestLog,
                workspaceId
            );

            return row;
        });
    }

    async switchWorkspace(userId: string, workspaceId: string): Promise<void> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        await this.validateWorkspaceGuard(workspaceId);
        await this.workspaceMemberDomain.validateWorkspaceMemberGuard(
            workspaceId,
            userId
        );

        await this.databaseService.client.$transaction(async tx => {
            await this.userDomain.setLastWorkspaceInTx(tx, userId, workspaceId);
            await this.activityLogDomain.recordInTx(
                tx,
                userId,
                EnumActivityLogAction.workspaceSwitched,
                requestLog,
                workspaceId
            );
        });
    }

    async softDeleteWorkspace(
        workspaceId: string,
        actorId: string
    ): Promise<void> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;
        const deletedAt = this.helperDateService.create();

        await this.databaseService.client.$transaction(async tx => {
            await this.workspaceRepository.softDeleteInTx(
                tx,
                workspaceId,
                actorId,
                deletedAt
            );
            await this.projectDomain.softDeleteByWorkspaceInTx(
                tx,
                workspaceId,
                actorId,
                deletedAt
            );
            await this.workspaceInviteRepository.expirePendingByWorkspaceInTx(
                tx,
                workspaceId,
                actorId
            );
            await this.workspaceJoinRequestRepository.cancelPendingByWorkspaceInTx(
                tx,
                workspaceId,
                actorId
            );
            await this.activityLogDomain.recordInTx(
                tx,
                actorId,
                EnumActivityLogAction.workspaceDeleted,
                requestLog,
                workspaceId
            );
        });
    }

    async getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput>,
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<Workspace>> {
        return this.workspaceRepository.findWithPaginationOffsetForAdmin(
            pagination,
            isPublic
        );
    }

    async getByIdForAdmin(workspaceId: string): Promise<Workspace> {
        const workspace =
            await this.workspaceRepository.findByIdForAdmin(workspaceId);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
    }

    /** Resolves a public workspace by slug. A workspace that exists but is not public reports the same `notFound` as one that does not exist, so a slug cannot be probed. */
    async previewWorkspace(slug: string): Promise<Workspace> {
        await this.assertJoinRequestAllowed();

        const workspace =
            await this.workspaceRepository.findActivePublicBySlug(slug);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
    }
}
