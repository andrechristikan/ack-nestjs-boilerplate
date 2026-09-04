import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { UserCreateModeRules } from '@modules/user/constants/user.create-mode.constant';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import {
    IUserOnboardingWorkspaceRows,
    IUserSignUpWorkspaceContext,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Builds the inputs a new account is created with: the personal workspace context, the onboarding activity logs and the workspace rows. */
@Injectable()
export class UserOnboardingUtil {
    private readonly personalWorkspaceNamePattern: string;
    private readonly workspaceSlugPrefix: string;
    private readonly workspaceSlugMaxLength: number;
    private readonly workspaceSlugMaxAttempts: number;

    constructor(
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
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

    private buildOnboardingActivityLogRow(
        action: EnumActivityLogAction,
        { ipAddress, userAgent, geoLocation }: IRequestLog,
        actorId: string
    ): Prisma.ActivityLogCreateManyUserInput {
        return {
            action,
            description: this.activityLogUtil.getDescription(action),
            ipAddress,
            userAgent: this.databaseUtil.toPlainObject(userAgent),
            geoLocation: this.databaseUtil.toPlainObject(geoLocation),
            createdBy: actorId,
        };
    }

    drawWorkspaceSlugCandidates(rows: number): string[][] {
        return Array.from({ length: rows }, () =>
            Array.from({ length: this.workspaceSlugMaxAttempts }, () =>
                this.helperStringService.generateSlug(
                    this.workspaceSlugPrefix,
                    this.workspaceSlugMaxLength
                )
            )
        );
    }

    buildPersonalWorkspaceContexts(
        usernames: string[],
        slugs: string[]
    ): IUserSignUpWorkspacePersonal[] {
        return usernames.map((username, index) => ({
            type: EnumUserSignUpWorkspaceContextType.personal,
            workspaceId: this.databaseUtil.createId(),
            slug: slugs[index],
            name: this.personalWorkspaceNamePattern.replace(
                '{username}',
                username
            ),
        }));
    }

    buildOnboardingActivityLogs(
        mode: EnumUserCreateMode,
        workspaceContext: IUserSignUpWorkspaceContext,
        requestLog: IRequestLog,
        actorId: string
    ): Prisma.ActivityLogCreateManyUserInput[] {
        const { createdAction, logsVerificationEmailRequest } =
            UserCreateModeRules[mode];
        const workspaceAction =
            workspaceContext.type ===
            EnumUserSignUpWorkspaceContextType.personal
                ? EnumActivityLogAction.workspaceCreated
                : EnumActivityLogAction.workspaceInviteAccepted;

        return [
            this.buildOnboardingActivityLogRow(
                createdAction,
                requestLog,
                actorId
            ),
            ...(logsVerificationEmailRequest
                ? [
                      this.buildOnboardingActivityLogRow(
                          EnumActivityLogAction.userSendVerificationEmail,
                          requestLog,
                          actorId
                      ),
                  ]
                : []),
            {
                ...this.buildOnboardingActivityLogRow(
                    workspaceAction,
                    requestLog,
                    actorId
                ),
                workspaceId: workspaceContext.workspaceId,
            },
        ];
    }

    buildWorkspaceRows(
        userId: string,
        workspaceContext: IUserSignUpWorkspaceContext,
        actorId: string
    ): IUserOnboardingWorkspaceRows {
        if (
            workspaceContext.type ===
            EnumUserSignUpWorkspaceContextType.personal
        ) {
            return {
                workspace: {
                    data: {
                        id: workspaceContext.workspaceId,
                        name: workspaceContext.name,
                        slug: workspaceContext.slug,
                        createdBy: actorId,
                        deletedAt: null,
                    },
                },
                workspaceMember: {
                    data: {
                        workspaceId: workspaceContext.workspaceId,
                        userId,
                        role: EnumWorkspaceMemberRole.owner,
                        createdBy: actorId,
                    },
                },
                workspaceInvite: null,
                projectMember: null,
            };
        }

        return {
            workspace: null,
            workspaceMember: {
                data: {
                    workspaceId: workspaceContext.workspaceId,
                    userId,
                    role: workspaceContext.workspaceMemberRole,
                    createdBy: actorId,
                },
            },
            workspaceInvite: {
                where: { id: workspaceContext.workspaceInviteId },
                data: {
                    status: EnumWorkspaceInviteStatus.accepted,
                    acceptedAt: this.helperDateService.create(),
                    acceptedByUserId: userId,
                    updatedBy: actorId,
                },
            },
            projectMember:
                workspaceContext.projectId && workspaceContext.projectMemberRole
                    ? {
                          data: {
                              projectId: workspaceContext.projectId,
                              userId,
                              role: workspaceContext.projectMemberRole,
                              createdBy: actorId,
                          },
                      }
                    : null,
        };
    }
}
