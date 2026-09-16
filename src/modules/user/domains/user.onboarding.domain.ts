import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { UserCreateModeRules } from '@modules/user/constants/user.create-mode.constant';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserOnboardingActivity,
    IUserSignUpWorkspaceContext,
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
        return usernames.map(username => ({
            type: EnumUserSignUpWorkspaceContextType.personal,
            workspaceId: this.databaseUtil.createId(),
            slugCandidates: this.drawWorkspaceSlugCandidates(),
            name: this.personalWorkspaceNamePattern.replace(
                '{username}',
                username
            ),
        }));
    }

    buildOnboardingActivities(
        mode: EnumUserCreateMode,
        workspaceContext: IUserSignUpWorkspaceContext
    ): IUserOnboardingActivity[] {
        const { createdAction, logsVerificationEmailRequest } =
            UserCreateModeRules[mode];
        const workspaceAction =
            workspaceContext.type ===
            EnumUserSignUpWorkspaceContextType.personal
                ? EnumActivityLogAction.workspaceCreated
                : EnumActivityLogAction.workspaceInviteAccepted;

        return [
            { action: createdAction, workspaceId: null },
            ...(logsVerificationEmailRequest
                ? [
                      {
                          action: EnumActivityLogAction.userSendVerificationEmail,
                          workspaceId: null,
                      },
                  ]
                : []),
            {
                action: workspaceAction,
                workspaceId: workspaceContext.workspaceId,
            },
        ];
    }

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        inputs: IUserCreateWithWorkspaceInput[]
    ): Promise<IUser[]> {
        return this.userRepository.createManyInTx(tx, inputs);
    }
}
