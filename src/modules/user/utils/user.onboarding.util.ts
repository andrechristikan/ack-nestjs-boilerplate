import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { WorkspaceInvite } from '@generated/prisma-client/client';
import type {
    IActivityLogMetadata,
    IActivityLogStageInput,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserOnboardingActivity,
    IUserOnboardingAdminAction,
    IUserSignUpWorkspaceInvite,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Shapes the inputs, workspace contexts, and activity rows of a new account and maps the collision its create raises onto a user exception. */
@Injectable()
export class UserOnboardingUtil {
    private readonly personalWorkspaceNamePattern: string;
    private readonly workspaceSlugPrefix: string;
    private readonly workspaceSlugMaxLength: number;
    private readonly workspaceSlugMaxAttempts: number;

    constructor(
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
    }

    buildPersonalWorkspaceContexts(
        usernames: string[]
    ): IUserSignUpWorkspacePersonal[] {
        return usernames.map(username => {
            const workspaceId = this.databaseUtil.createId();
            const slugCandidates =
                this.helperStringService.generateSlugCandidates(
                    this.workspaceSlugPrefix,
                    this.workspaceSlugMaxLength,
                    this.workspaceSlugMaxAttempts
                );
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

    buildInviteWorkspaceContext(
        invite: WorkspaceInvite
    ): IUserSignUpWorkspaceInvite {
        return {
            type: EnumUserSignUpWorkspaceContextType.invite,
            workspaceId: invite.workspaceId,
            workspaceInviteId: invite.id,
            invitedByUserId: invite.invitedByUserId,
            workspaceMemberRole: invite.workspaceRole,
            projectId: invite.projectId ?? null,
            projectMemberRole: invite.projectRole ?? null,
        };
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
            metadata: { targetUserId: workspaceContext.invitedByUserId },
        });
        if (workspaceContext.invitedByUserId !== userId) {
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
                const user = users[0]!;

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

    /** Lists the activity stage inputs of an onboarding: the admin payload row first when an admin action is given, then every input's rows in order. */
    buildActivityStages(
        mode: EnumUserCreateMode,
        inputs: IUserCreateWithWorkspaceInput[],
        users: IUser[],
        adminPayloadAction: IUserOnboardingAdminAction | null
    ): IActivityLogStageInput<EnumActivityLogAction>[] {
        const stages: IActivityLogStageInput<EnumActivityLogAction>[] = [];
        if (adminPayloadAction) {
            const metadata = this.buildAdminPayloadMetadata(
                adminPayloadAction,
                users
            );
            stages.push({ action: adminPayloadAction, metadata });
        }

        for (const [index, input] of inputs.entries()) {
            const activities = this.buildOnboardingActivities(
                mode,
                input,
                users[index]!
            );

            for (const activity of activities) {
                stages.push({
                    action: activity.action,
                    userId: activity.userId,
                    createdBy: activity.createdBy,
                    ...(activity.workspaceId !== null && {
                        workspaceId: activity.workspaceId,
                    }),
                    metadata: activity.metadata,
                });
            }
        }

        return stages;
    }

    /** Translates a unique collision raised by the onboarding create into its user exception, returning anything else untouched. */
    mapCreateCollision(error: unknown): unknown {
        const isUsernameCollision = this.databaseUtil.isUniqueCollision(
            error,
            'username'
        );
        if (isUsernameCollision) {
            return new UserUsernameExistException();
        }

        const isEmailCollision = this.databaseUtil.isUniqueCollision(
            error,
            'email'
        );
        if (isEmailCollision) {
            return new UserEmailExistException();
        }

        return error;
    }
}
