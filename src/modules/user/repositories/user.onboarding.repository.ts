import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumNotificationChannel,
    EnumNotificationType,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    EnumUserStatus,
    EnumWorkspaceInviteStatus,
    Prisma,
} from '@generated/prisma-client';
import { TwoFactorActiveBackupCodesFilter } from '@modules/user/constants/user.constant';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserOnboardingWorkspaceRows,
    IUserSignUpWorkspaceContext,
} from '@modules/user/interfaces/user.interface';
import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserOnboardingRepository {
    private readonly onboardingCreateTimeoutInMs: number;
    private readonly onboardingCreateBulkTimeoutInMs: number;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.onboardingCreateTimeoutInMs = this.configService.get<number>(
            'user.onboarding.createTimeoutInMs'
        )!;
        this.onboardingCreateBulkTimeoutInMs = this.configService.get<number>(
            'user.onboarding.createBulkTimeoutInMs'
        )!;
    }

    private buildWorkspaceOperations(
        tx: IDatabaseTransactionClient,
        {
            workspace,
            workspaceMember,
            workspaceInvite,
            projectMember,
        }: IUserOnboardingWorkspaceRows
    ): Prisma.PrismaPromise<unknown>[] {
        const operations: Prisma.PrismaPromise<unknown>[] = [];

        if (workspace) {
            operations.push(tx.workspace.create(workspace));
        }

        operations.push(tx.workspaceMember.create(workspaceMember));

        if (workspaceInvite) {
            operations.push(tx.workspaceInvite.update(workspaceInvite));
        }

        if (projectMember) {
            operations.push(tx.projectMember.create(projectMember));
        }

        return operations;
    }

    private buildUserCreateData(
        input: IUserCreateWithWorkspaceInput
    ): Prisma.UserUncheckedCreateInput {
        return {
            id: input.userId,
            email: input.email,
            countryId: input.countryId,
            name: input.name,
            roleId: input.roleId,
            signUpFrom: input.signUpFrom,
            signUpWith: input.signUpWith,
            username: input.username,
            isVerified: input.isVerified,
            status: EnumUserStatus.active,
            lastWorkspaceId: input.workspaceContext.workspaceId,
            lastWorkspaceChangedAt: this.helperDateService.create(),
            termsOfServiceAccepted:
                input.termPolicy[EnumTermPolicyType.termsOfService],
            privacyAccepted: input.termPolicy[EnumTermPolicyType.privacy],
            cookiesAccepted: input.termPolicy[EnumTermPolicyType.cookies],
            marketingAccepted: input.termPolicy[EnumTermPolicyType.marketing],
            createdBy: input.createdBy,
            deletedAt: null,
            ...(input.password
                ? {
                      passwordCreated: input.password.passwordCreated,
                      passwordExpired: input.password.passwordExpired,
                      password: input.password.passwordHash,
                      passwordAttempt: 0,
                  }
                : {}),
            ...(input.password && input.passwordHistoryType
                ? {
                      passwordHistories: {
                          create: {
                              password: input.password.passwordHash,
                              type: input.passwordHistoryType,
                              expiredAt: input.password.passwordPeriodExpired,
                              createdAt: input.password.passwordCreated,
                              createdBy: input.createdBy,
                          },
                      },
                  }
                : {}),
            activityLogs: {
                createMany: {
                    data: input.activityLogs,
                },
            },
            notificationSettings: {
                createMany: {
                    data: Object.values(EnumNotificationChannel)
                        .map(channel =>
                            Object.values(EnumNotificationType).map(type => ({
                                channel,
                                type,
                                isActive: true,
                            }))
                        )
                        .flat(),
                },
            },
            ...(input.verification
                ? {
                      verifications: {
                          create: {
                              reference: input.verification.reference,
                              token: input.verification.token,
                              type: input.verification.type,
                              to: input.verification.to,
                              expiredAt: input.verification.expiredAt,
                              verifiedAt: input.verification.verifiedAt,
                              isUsed: input.verification.isUsed,
                              createdBy: input.createdBy,
                          },
                      },
                  }
                : {}),
            twoFactor: {
                create: {
                    enabled: false,
                    requiredSetup: false,
                    createdBy: input.createdBy,
                },
            },
        };
    }

    /** Returns a copy of the input carrying the candidate slug for this attempt, leaving the given input untouched. */
    private withSlugAttempt(
        input: IUserCreateWithWorkspaceInput,
        attempt: number
    ): IUserCreateWithWorkspaceInput {
        const { workspaceContext, workspaceRows } = input;

        if (
            workspaceContext.type !==
                EnumUserSignUpWorkspaceContextType.personal ||
            workspaceRows.workspace === null
        ) {
            return input;
        }

        return {
            ...input,
            workspaceRows: {
                ...workspaceRows,
                workspace: {
                    ...workspaceRows.workspace,
                    data: {
                        ...workspaceRows.workspace.data,
                        slug: workspaceContext.slugCandidates[attempt],
                    },
                },
            },
        };
    }

    private async createManyWithWorkspaceInTransaction(
        inputs: IUserCreateWithWorkspaceInput[],
        timeoutInMs: number
    ): Promise<IUser[]> {
        const acceptedTermPolicyTypes = [
            ...new Set(inputs.flatMap(input => input.acceptedTermPolicyTypes)),
        ];

        const slugCandidateCounts = inputs.flatMap(({ workspaceContext }) =>
            workspaceContext.type ===
            EnumUserSignUpWorkspaceContextType.personal
                ? [workspaceContext.slugCandidates.length]
                : []
        );
        const slugAttemptCount =
            slugCandidateCounts.length > 0
                ? Math.min(...slugCandidateCounts)
                : 1;

        for (let attempt = 0; attempt < slugAttemptCount; attempt++) {
            const attemptInputs = inputs.map(input =>
                this.withSlugAttempt(input, attempt)
            );

            try {
                return await this.databaseService.client.$transaction(
                    async tx => {
                        const termPolicies = await tx.termPolicy.findMany({
                            where: {
                                type: { in: acceptedTermPolicyTypes },
                                status: EnumTermPolicyStatus.published,
                            },
                            select: {
                                id: true,
                                type: true,
                            },
                        });

                        const users = await Promise.all(
                            attemptInputs.map(input =>
                                tx.user.create({
                                    data: this.buildUserCreateData(input),
                                    include: {
                                        role: { include: { policies: true } },
                                        twoFactor: {
                                            include: {
                                                backupCodes: {
                                                    where: TwoFactorActiveBackupCodesFilter,
                                                },
                                            },
                                        },
                                    },
                                })
                            )
                        );

                        await Promise.all(
                            attemptInputs.flatMap(input => [
                                ...this.buildWorkspaceOperations(
                                    tx,
                                    input.workspaceRows
                                ),
                                ...termPolicies
                                    .filter(termPolicy =>
                                        input.acceptedTermPolicyTypes.includes(
                                            termPolicy.type
                                        )
                                    )
                                    .map(termPolicy =>
                                        tx.termPolicyUserAcceptance.create({
                                            data: {
                                                userId: input.userId,
                                                termPolicyId: termPolicy.id,
                                                createdBy: input.createdBy,
                                            },
                                        })
                                    ),
                            ])
                        );

                        return users;
                    },
                    { timeout: timeoutInMs }
                );
            } catch (error: unknown) {
                if (this.databaseUtil.isUniqueCollision(error, 'slug')) {
                    continue;
                }

                throw error;
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    /** Resolves a sign-up invite token to its workspace context, accepting only pending, unexpired invites whose workspace is still active. */
    async resolveInviteWorkspaceContext(
        hashedToken: string,
        email: string,
        now: Date
    ): Promise<IUserSignUpWorkspaceContext | null> {
        const invite =
            await this.databaseService.client.workspaceInvite.findFirst({
                where: {
                    token: hashedToken,
                    status: EnumWorkspaceInviteStatus.pending,
                    expiredAt: { gt: now },
                    workspace: WorkspaceActiveFilter,
                },
            });

        if (!invite || invite.email.toLowerCase() !== email.toLowerCase()) {
            return null;
        }

        return {
            type: EnumUserSignUpWorkspaceContextType.invite,
            workspaceId: invite.workspaceId,
            workspaceInviteId: invite.id,
            workspaceMemberRole: invite.workspaceRole,
            projectId: invite.projectId ?? undefined,
            projectMemberRole: invite.projectRole ?? undefined,
        };
    }

    async createWithWorkspace(
        input: IUserCreateWithWorkspaceInput
    ): Promise<IUser> {
        const [user] = await this.createManyWithWorkspaceInTransaction(
            [input],
            this.onboardingCreateTimeoutInMs
        );

        return user;
    }

    async createManyWithWorkspace(
        inputs: IUserCreateWithWorkspaceInput[]
    ): Promise<IUser[]> {
        return this.createManyWithWorkspaceInTransaction(
            inputs,
            this.onboardingCreateBulkTimeoutInMs
        );
    }
}
