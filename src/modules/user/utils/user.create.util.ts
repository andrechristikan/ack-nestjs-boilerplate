import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumActivityLogAction,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { WorkspaceInvite } from '@generated/prisma-client/client';
import type { IActivityLogInput } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IPasswordHistoryCreate } from '@modules/password-history/interfaces/password-history.interface';
import type { ITermPolicyAcceptanceCreate } from '@modules/term-policy/interfaces/term-policy.interface';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { EnumUserCreateWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUserCreateActivity } from '@modules/user/interfaces/user.create.interface';
import type {
    IUserCreateContract,
    IUserCreateWithWorkspaceInput,
    IUserCreateWorkspaceContext,
    IUserCreateWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserCreateUtil {
    private readonly personalNamePattern: string;
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly slugMaxAttempts: number;

    constructor(
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.personalNamePattern = this.configService.get<string>(
            'workspace.personalNamePattern'
        )!;
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

    private buildActivities(
        {
            createdAction,
            logsVerificationEmailRequest,
            personalWorkspaceAction,
            logsActingAdmin,
        }: IUserCreateContract,
        {
            userId,
            createdAt,
            createdBy,
            workspaceContext,
        }: IUserCreateWithWorkspaceInput
    ): IUserCreateActivity[] {
        const activities: IUserCreateActivity[] = [
            {
                action: createdAction,
                userId,
                workspaceId: null,
                createdBy,
                metadata: logsActingAdmin
                    ? { actorUserId: createdBy, timestamp: createdAt }
                    : {},
            },
        ];

        if (logsVerificationEmailRequest) {
            activities.push({
                action: EnumActivityLogAction.userVerificationEmailSent,
                userId,
                workspaceId: null,
                createdBy,
                metadata: {},
            });
        }

        if (
            workspaceContext.type ===
            EnumUserCreateWorkspaceContextType.personal
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
    ): IUserCreateWorkspacePersonal[] {
        return usernames.map(username => {
            const workspaceId = this.databaseUtil.createId();
            const slugCandidates =
                this.helperStringService.generateSlugCandidates(
                    this.slugPrefix,
                    this.slugMaxLength,
                    this.slugMaxAttempts
                );
            const name = this.personalNamePattern.replace(
                '{username}',
                () => username
            );

            return {
                type: EnumUserCreateWorkspaceContextType.personal,
                workspaceId,
                slugCandidates,
                name,
            };
        });
    }

    buildSignUpWorkspaceContext(
        invite: WorkspaceInvite | null,
        username: string
    ): IUserCreateWorkspaceContext {
        if (invite === null) {
            const personalContexts = this.buildPersonalWorkspaceContexts([
                username,
            ]);

            return personalContexts[0]!;
        }

        return {
            type: EnumUserCreateWorkspaceContextType.invite,
            workspaceId: invite.workspaceId,
            workspaceInviteId: invite.id,
            invitedByUserId: invite.invitedByUserId,
            workspaceMemberRole: invite.workspaceRole,
            projectId: invite.projectId ?? null,
            projectMemberRole: invite.projectRole ?? null,
        };
    }

    buildStages(
        contract: IUserCreateContract,
        inputs: IUserCreateWithWorkspaceInput[]
    ): IActivityLogInput<EnumActivityLogAction>[] {
        const stages: IActivityLogInput<EnumActivityLogAction>[] = [];

        for (const input of inputs) {
            const activities = this.buildActivities(contract, input);

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

    buildTermPolicyAcceptanceEntries(
        inputs: IUserCreateWithWorkspaceInput[]
    ): ITermPolicyAcceptanceCreate[] {
        return inputs.map(({ userId, acceptedTermPolicyTypes, createdBy }) => ({
            userId,
            types: acceptedTermPolicyTypes,
            createdBy,
        }));
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
}
