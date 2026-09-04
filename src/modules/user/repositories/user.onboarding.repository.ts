import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumNotificationChannel,
    EnumNotificationType,
    EnumTermPolicyStatus,
    EnumUserStatus,
    EnumWorkspaceInviteStatus,
    Prisma,
} from '@generated/prisma-client';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserOnboardingWorkspaceRows,
    IUserSignUpWorkspaceContext,
} from '@modules/user/interfaces/user.interface';
import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserOnboardingRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

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
            termPolicy: input.termPolicy,
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

    /** True when a unique-constraint violation names the workspace slug, the one value this repository generates. */
    private isWorkspaceSlugCollision(
        error: Prisma.PrismaClientKnownRequestError
    ): boolean {
        const target = error.meta?.target;
        const fields = Array.isArray(target) ? target : [target];

        return fields.some(
            field =>
                typeof field === 'string' &&
                field.toLowerCase().includes('slug')
        );
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
                    workspace: { OR: WorkspaceActiveFilter },
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

    /** Picks one workspace slug per row: the first candidate free in the database and not already handed out earlier in the same call. */
    async findFreeWorkspaceSlugs(
        candidatesPerRow: string[][]
    ): Promise<string[]> {
        const slugs: string[] = [];

        for (const candidates of candidatesPerRow) {
            let picked: string | null = null;

            for (const slug of candidates) {
                if (slugs.includes(slug)) {
                    continue;
                }

                const taken =
                    await this.databaseService.client.workspace.findFirst({
                        where: { slug },
                        select: { id: true },
                    });
                if (!taken) {
                    picked = slug;
                    break;
                }
            }

            if (!picked) {
                throw new DatabaseUniqueValueGenerationFailedException();
            }

            slugs.push(picked);
        }

        return slugs;
    }

    async createWithWorkspace(
        inputs: IUserCreateWithWorkspaceInput[],
        timeoutInMs: number
    ): Promise<IUser[]> {
        const acceptedTermPolicyTypes = [
            ...new Set(inputs.flatMap(input => input.acceptedTermPolicyTypes)),
        ];

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
                        inputs.map(input =>
                            tx.user.create({
                                data: this.buildUserCreateData(input),
                                include: {
                                    role: true,
                                    twoFactor: true,
                                },
                            })
                        )
                    );

                    await Promise.all(
                        inputs.flatMap(input => [
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
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002' &&
                this.isWorkspaceSlugCollision(error)
            ) {
                throw new DatabaseUniqueValueGenerationFailedException();
            }

            throw error;
        }
    }
}
