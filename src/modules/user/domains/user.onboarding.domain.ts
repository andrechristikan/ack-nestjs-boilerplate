import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserOnboardingActivity,
    IUserOnboardingAdminAction,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Builds the inputs a new account is created with and writes user rows inside a caller-owned transaction. */
@Injectable()
export class UserOnboardingDomain {
    private readonly personalWorkspaceNamePattern: string;
    private readonly workspaceSlugPrefix: string;
    private readonly workspaceSlugMaxLength: number;
    private readonly workspaceSlugMaxAttempts: number;
    private readonly onboardingCreateTimeoutInMs: number;
    private readonly onboardingCreateBulkTimeoutInMs: number;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.personalWorkspaceNamePattern = this.configService.get<string>(
            'workspace.personalNamePattern'
        )!;
        this.workspaceSlugPrefix = this.configService.get<string>(
            'workspace.slugPrefix'
        )!;
        this.workspaceSlugMaxLength = this.configService.get<number>(
            'workspace.slugMaxLength'
        )!;
        this.workspaceSlugMaxAttempts = this.configService.get<number>(
            'workspace.slugMaxAttempts'
        )!;
        this.onboardingCreateTimeoutInMs = this.configService.get<number>(
            'user.onboarding.createTimeoutInMs'
        )!;
        this.onboardingCreateBulkTimeoutInMs = this.configService.get<number>(
            'user.onboarding.createBulkTimeoutInMs'
        )!;
    }

    private drawWorkspaceSlugCandidates(): string[] {
        return Array.from({ length: this.workspaceSlugMaxAttempts }, () =>
            this.helperStringService.generateSlug(
                this.workspaceSlugPrefix,
                this.workspaceSlugMaxLength
            )
        );
    }

    getCreateTimeoutInMs(): number {
        return this.onboardingCreateTimeoutInMs;
    }

    getCreateBulkTimeoutInMs(): number {
        return this.onboardingCreateBulkTimeoutInMs;
    }

    buildPersonalWorkspaceContexts(
        usernames: string[]
    ): IUserSignUpWorkspacePersonal[] {
        return usernames.map(username => {
            const workspaceId = this.databaseUtil.createId();
            const slugCandidates = this.drawWorkspaceSlugCandidates();
            const name = this.personalWorkspaceNamePattern.replace(
                '{username}',
                () => username
            );

            return {
                type: EnumUserSignUpWorkspaceContextType.personal,
                workspaceId,
                slugCandidates,
                name,
            };
        });
    }

    buildOnboardingActivities(
        mode: EnumUserCreateMode,
        input: IUserCreateWithWorkspaceInput,
        user: IUser
    ): IUserOnboardingActivity[] {
        const {
            createdAction,
            logsVerificationEmailRequest,
            personalWorkspaceAction,
            logsActingAdmin,
        } = UserCreateContract[mode];
        const { userId, createdBy, workspaceContext } = input;
        const activities: IUserOnboardingActivity[] = [
            {
                action: createdAction,
                userId,
                workspaceId: null,
                createdBy,
                metadata: logsActingAdmin
                    ? { actorUserId: createdBy, timestamp: user.createdAt }
                    : {},
            },
        ];

        if (logsVerificationEmailRequest) {
            activities.push({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId,
                workspaceId: null,
                createdBy,
                metadata: {},
            });
        }

        if (
            workspaceContext.type ===
            EnumUserSignUpWorkspaceContextType.personal
        ) {
            activities.push({
                action: personalWorkspaceAction,
                userId,
                workspaceId: workspaceContext.workspaceId,
                createdBy,
                metadata: logsActingAdmin ? { actorUserId: createdBy } : {},
            });

            return activities;
        }

        activities.push({
            action: EnumActivityLogAction.workspaceInviteAccepted,
            userId,
            workspaceId: workspaceContext.workspaceId,
            createdBy,
            metadata: workspaceContext.invitedByUserId
                ? { targetUserId: workspaceContext.invitedByUserId }
                : {},
        });
        if (
            workspaceContext.invitedByUserId &&
            workspaceContext.invitedByUserId !== userId
        ) {
            activities.push({
                action: EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
                userId: workspaceContext.invitedByUserId,
                workspaceId: workspaceContext.workspaceId,
                createdBy: userId,
                metadata: { actorUserId: userId },
            });
        }

        return activities;
    }

    buildAdminPayloadMetadata(
        action: IUserOnboardingAdminAction,
        users: IUser[]
    ): IActivityLogMetadata {
        switch (action) {
            case EnumActivityLogAction.adminUserCreate: {
                const [user] = users;

                return {
                    targetUserId: user.id,
                    targetUsername: user.username,
                    timestamp: user.createdAt,
                };
            }
            case EnumActivityLogAction.adminUserImport:
                return { userCount: users.length };
        }
    }

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        inputs: IUserCreateWithWorkspaceInput[]
    ): Promise<IUser[]> {
        return this.userRepository.createManyInTx(tx, inputs);
    }
}
