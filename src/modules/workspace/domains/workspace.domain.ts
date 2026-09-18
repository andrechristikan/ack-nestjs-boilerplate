import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserOnboardingAdminAction,
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
import type {
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
        const isSlugPatternValid = this.slugRegex.test(slug);
        if (slug.length > this.slugMaxLength || !isSlugPatternValid) {
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
        timeoutInMs: number,
        adminPayloadAction?: IUserOnboardingAdminAction
    ): Promise<IUser[]> {
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
                const onboarded = await this.databaseService.withTransaction(
                    async tx => {
                        const users =
                            await this.userOnboardingDomain.createManyInTx(
                                tx,
                                inputs
                            );
                        const rows: IUser[] = [];

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
                            rows.push({ ...users[index], twoFactor });
                        }

                        const ownedUsers = this.buildOwnedUsers(
                            inputs,
                            attempt
                        );
                        await this.createOwnedForUsersInTx(tx, ownedUsers);

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
                        }

                        const events = this.prepareOnboardingActivities(
                            inputs,
                            rows,
                            mode,
                            adminPayloadAction
                        );

                        return { rows, events };
                    },
                    { timeout: timeoutInMs }
                );

                this.activityLogDomain.stagePrepared(onboarded.events);

                return onboarded.rows;
            } catch (error: unknown) {
                const isSlugCollision = this.databaseUtil.isUniqueCollision(
                    error,
                    'slug'
                );
                if (isSlugCollision) {
                    continue;
                }

                const exception =
                    this.userOnboardingUtil.mapCreateCollision(error);
                throw exception;
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    private prepareOnboardingActivities(
        inputs: IUserCreateWithWorkspaceInput[],
        users: IUser[],
        mode: EnumUserCreateMode,
        adminPayloadAction?: IUserOnboardingAdminAction
    ): IActivityLogStagedEvent[] {
        const events: IActivityLogStagedEvent[] = [];
        if (adminPayloadAction) {
            const adminPayloadMetadata =
                this.userOnboardingDomain.buildAdminPayloadMetadata(
                    adminPayloadAction,
                    users
                );
            const adminPayloadEvent = this.activityLogDomain.prepare({
                action: adminPayloadAction,
                metadata: adminPayloadMetadata,
            });
            events.push(adminPayloadEvent);
        }

        for (const [index, input] of inputs.entries()) {
            const onboardingActivities =
                this.userOnboardingDomain.buildOnboardingActivities(
                    mode,
                    input,
                    users[index]
                );

            for (const activity of onboardingActivities) {
                const activityEvent = this.activityLogDomain.prepare({
                    action: activity.action,
                    userId: activity.userId,
                    createdBy: activity.createdBy,
                    workspaceId: activity.workspaceId,
                    metadata: activity.metadata,
                });
                events.push(activityEvent);
            }
        }

        return events;
    }

    async createWorkspace(
        userId: string,
        create: IWorkspaceCreate
    ): Promise<Workspace> {
        const ownedCount =
            await this.workspaceMemberRepository.countOwnedActiveByUser(userId);
        if (ownedCount >= this.maxWorkspacesPerUser) {
            throw new WorkspaceCapReachedException();
        }

        const slugCandidates = this.drawSlugCandidates();

        for (const slug of slugCandidates) {
            const workspaceId = this.databaseUtil.createId();
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.workspaceCreated,
                    userId: userId,
                    createdBy: userId,
                    workspaceId: workspaceId,
                }),
            ];

            let workspace: Workspace;
            try {
                workspace = await this.databaseService.withTransaction(tx =>
                    this.createInTx(tx, userId, create, slug, workspaceId)
                );
            } catch (error: unknown) {
                const isSlugCollision = this.databaseUtil.isUniqueCollision(
                    error,
                    'slug'
                );
                if (!isSlugCollision) {
                    throw error;
                }

                continue;
            }

            this.activityLogDomain.stagePrepared(events);

            return workspace;
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
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: workspaceId,
            }),
        ];

        const row = await this.workspaceRepository.updateDetails(
            workspaceId,
            update
        );

        this.activityLogDomain.stagePrepared(events);

        return row;
    }

    async updateWorkspaceIsPublic(
        workspaceId: string,
        actorId: string,
        isPublic: boolean
    ): Promise<Workspace> {
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceVisibilityUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: workspaceId,
            }),
        ];

        const row = await this.workspaceRepository.updateIsPublic(
            workspaceId,
            isPublic
        );

        this.activityLogDomain.stagePrepared(events);

        return row;
    }

    async updateWorkspaceSlug(
        workspaceId: string,
        actorId: string,
        slug: string
    ): Promise<Workspace> {
        this.assertSlugAllowed(slug);

        const slugTaken = await this.workspaceRepository.existsBySlug(
            slug,
            workspaceId
        );
        if (slugTaken) {
            throw new WorkspaceSlugAlreadyExistsException();
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: workspaceId,
            }),
        ];

        const row = await this.workspaceRepository.updateSlug(
            workspaceId,
            slug
        );

        this.activityLogDomain.stagePrepared(events);

        return row;
    }

    async switchWorkspace(userId: string, workspaceId: string): Promise<void> {
        await this.validateWorkspaceGuard(workspaceId);
        await this.workspaceMemberDomain.validateWorkspaceMemberGuard(
            workspaceId,
            userId
        );

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceSwitched,
                userId: userId,
                createdBy: userId,
                workspaceId: workspaceId,
            }),
        ];

        await this.userDomain.setLastWorkspace(userId, workspaceId);

        this.activityLogDomain.stagePrepared(events);
    }

    async softDeleteWorkspace(
        workspaceId: string,
        actorId: string
    ): Promise<void> {
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceDeleted,
                userId: actorId,
                createdBy: actorId,
                workspaceId: workspaceId,
            }),
        ];
        const deletedAt = this.helperDateService.create();

        await this.databaseService.withTransaction(async tx => {
            await this.workspaceRepository.softDeleteInTx(
                tx,
                workspaceId,
                deletedAt
            );
            await this.projectDomain.softDeleteByWorkspaceInTx(
                tx,
                workspaceId,
                deletedAt,
                actorId
            );
            await this.workspaceInviteRepository.expirePendingByWorkspaceInTx(
                tx,
                workspaceId
            );
            await this.workspaceJoinRequestRepository.cancelPendingByWorkspaceInTx(
                tx,
                workspaceId
            );
        });

        this.activityLogDomain.stagePrepared(events);
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
