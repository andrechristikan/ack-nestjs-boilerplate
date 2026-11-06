import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumActivityLogAction,
    EnumTermPolicyType,
    EnumUserLoginWith,
    EnumUserSignUpWith,
} from '@generated/prisma-client/client';
import type { WorkspaceInvite } from '@generated/prisma-client/client';
import type { IActivityLogStageInput } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumFeatureFlagKey } from '@modules/feature-flag/enums/feature-flag.enum';
import type { IPasswordHistoryCreate } from '@modules/password-history/interfaces/password-history.interface';
import type { ITermPolicyAcceptanceCreate } from '@modules/term-policy/interfaces/term-policy.interface';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type { IUserCreateActivity } from '@modules/user/interfaces/user.create.interface';
import type {
    IUser,
    IUserCreateContract,
    IUserCreateWithWorkspaceInput,
    IUserLoginSocial,
    IUserSignUpResolved,
    IUserSignUpWorkspaceContext,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserCreateUtil {
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

    private buildActivities(
        {
            createdAction,
            logsVerificationEmailRequest,
            personalWorkspaceAction,
            logsActingAdmin,
        }: IUserCreateContract,
        { userId, createdBy, workspaceContext }: IUserCreateWithWorkspaceInput,
        user: IUser
    ): IUserCreateActivity[] {
        const activities: IUserCreateActivity[] = [
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

    buildSignUpWorkspaceContext(
        invite: WorkspaceInvite | null,
        username: string
    ): IUserSignUpWorkspaceContext {
        if (invite === null) {
            const personalContexts = this.buildPersonalWorkspaceContexts([
                username,
            ]);

            return personalContexts[0]!;
        }

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

    buildAcceptedTermPolicyTypes(
        cookies: boolean,
        marketing: boolean
    ): EnumTermPolicyType[] {
        return [
            ...UserTermPolicyContract.requiredTypes,
            ...(cookies ? [EnumTermPolicyType.cookies] : []),
            ...(marketing ? [EnumTermPolicyType.marketing] : []),
        ];
    }

    buildSocialCreate(
        email: string,
        loginWith: EnumUserLoginWith,
        {
            from,
            username,
            name,
            countryId,
            cookies,
            marketing,
        }: IUserLoginSocial,
        { roleId, workspaceContext }: IUserSignUpResolved
    ): IUserCreateWithWorkspaceInput {
        const userId = this.databaseUtil.createId();
        const acceptedTermPolicyTypes = this.buildAcceptedTermPolicyTypes(
            cookies,
            marketing
        );

        return {
            userId,
            email: email.trim().toLowerCase(),
            name,
            username,
            countryId,
            roleId,
            signUpFrom: from,
            signUpWith:
                loginWith === EnumUserLoginWith.socialApple
                    ? EnumUserSignUpWith.socialApple
                    : EnumUserSignUpWith.socialGoogle,
            isVerified: true,
            acceptedTermPolicyTypes,
            password: null,
            passwordHistoryType: UserCreateContract.social.passwordHistoryType,
            verification: null,
            workspaceContext,
            createdBy: userId,
        };
    }

    /** Lists each user's activity stage inputs under the contract; `users[i]` must be the created user of `inputs[i]`. */
    buildStages(
        contract: IUserCreateContract,
        inputs: IUserCreateWithWorkspaceInput[],
        users: IUser[]
    ): IActivityLogStageInput<EnumActivityLogAction>[] {
        const stages: IActivityLogStageInput<EnumActivityLogAction>[] = [];

        for (const [index, input] of inputs.entries()) {
            const activities = this.buildActivities(
                contract,
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

    buildCreateByAdminStages(
        input: IUserCreateWithWorkspaceInput,
        user: IUser
    ): IActivityLogStageInput<EnumActivityLogAction>[] {
        const stages = this.buildStages(
            UserCreateContract.admin,
            [input],
            [user]
        );

        return [
            {
                action: EnumActivityLogAction.adminUserCreate,
                metadata: {
                    targetUserId: user.id,
                    targetUsername: user.username,
                    timestamp: user.createdAt,
                },
            },
            ...stages,
        ];
    }

    buildImportByAdminStages(
        inputs: IUserCreateWithWorkspaceInput[],
        users: IUser[]
    ): IActivityLogStageInput<EnumActivityLogAction>[] {
        const stages = this.buildStages(
            UserCreateContract.admin,
            inputs,
            users
        );

        return [
            {
                action: EnumActivityLogAction.adminUserImport,
                metadata: { userCount: users.length },
            },
            ...stages,
        ];
    }

    buildPasswordHistoryEntries(
        inputs: IUserCreateWithWorkspaceInput[]
    ): IPasswordHistoryCreate[] {
        const entries: IPasswordHistoryCreate[] = [];

        for (const {
            userId,
            password,
            passwordHistoryType,
            createdBy,
        } of inputs) {
            if (password && passwordHistoryType) {
                entries.push({
                    userId,
                    password: password.passwordHash,
                    type: passwordHistoryType,
                    expiredAt: password.passwordPeriodExpired,
                    createdAt: password.passwordCreated,
                    createdBy,
                });
            }
        }

        return entries;
    }

    buildTermPolicyAcceptanceEntries(
        inputs: IUserCreateWithWorkspaceInput[]
    ): ITermPolicyAcceptanceCreate[] {
        return inputs.map(({ userId, acceptedTermPolicyTypes, createdBy }) => ({
            userId,
            types: acceptedTermPolicyTypes,
            createdBy,
        }));
    }

    buildUserIds(inputs: IUserCreateWithWorkspaceInput[]): string[] {
        return inputs.map(({ userId }) => userId);
    }

    resolveSocialFeatureFlagKey(
        loginWith: EnumUserLoginWith
    ): EnumFeatureFlagKey {
        return loginWith === EnumUserLoginWith.socialGoogle
            ? EnumFeatureFlagKey.loginWithGoogle
            : EnumFeatureFlagKey.loginWithApple;
    }

    /** Maps a username or email unique collision to its user exception and returns any other error untouched. */
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
