import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumInvitationType,
    EnumPasswordHistoryType,
    EnumProjectMemberStatus,
    EnumRoleScope,
    EnumTenantMemberStatus,
    EnumUserStatus,
    Invitation,
    Prisma,
    User,
} from '@prisma/client';

type InvitationWithUser = Prisma.InvitationGetPayload<{
    include: { user: true };
}>;

@Injectable()
export class InvitationRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperService: HelperService
    ) {}

    async findOneByToken(token: string): Promise<InvitationWithUser | null> {
        return this.databaseService.invitation.findFirst({
            where: {
                token,
                user: {
                    deletedAt: null,
                },
            },
            include: {
                user: true,
            },
        });
    }

    async findOneActiveByToken(token: string): Promise<InvitationWithUser | null> {
        const today = this.helperService.dateCreate();

        return this.databaseService.invitation.findFirst({
            where: {
                token,
                acceptedAt: null,
                expiresAt: {
                    gt: today,
                },
                deletedAt: null,
                user: {
                    deletedAt: null,
                    status: EnumUserStatus.active,
                },
            },
            include: {
                user: true,
            },
        });
    }

    async findOneLatestByUserId(
        userId: string,
        options?: {
            includeDeleted?: boolean;
        }
    ): Promise<Invitation | null> {
        return this.databaseService.invitation.findFirst({
            where: {
                userId,
                ...(options?.includeDeleted ? {} : { deletedAt: null }),
                user: {
                    deletedAt: null,
                },
            },
            orderBy: {
                createdAt: EnumPaginationOrderDirectionType.desc,
            },
        });
    }

    async findOneLatestByUserAndContext(
        userId: string,
        invitationType: EnumInvitationType,
        contextId: string,
        options?: {
            includeDeleted?: boolean;
        }
    ): Promise<Invitation | null> {
        return this.databaseService.invitation.findFirst({
            where: {
                userId,
                invitationType,
                contextId,
                ...(options?.includeDeleted ? {} : { deletedAt: null }),
                user: {
                    deletedAt: null,
                },
            },
            orderBy: {
                createdAt: EnumPaginationOrderDirectionType.desc,
            },
        });
    }

    async findOneLatestActiveByUserId(userId: string): Promise<Invitation | null> {
        const today = this.helperService.dateCreate();

        return this.databaseService.invitation.findFirst({
            where: {
                userId,
                deletedAt: null,
                acceptedAt: null,
                expiresAt: {
                    gt: today,
                },
                user: {
                    deletedAt: null,
                },
            },
            orderBy: {
                createdAt: EnumPaginationOrderDirectionType.desc,
            },
        });
    }

    async findOneLatestActiveByUserAndContext(
        userId: string,
        invitationType: EnumInvitationType,
        contextId: string
    ): Promise<Invitation | null> {
        const today = this.helperService.dateCreate();

        return this.databaseService.invitation.findFirst({
            where: {
                userId,
                invitationType,
                contextId,
                deletedAt: null,
                acceptedAt: null,
                expiresAt: {
                    gt: today,
                },
                user: {
                    deletedAt: null,
                },
            },
            orderBy: {
                createdAt: EnumPaginationOrderDirectionType.desc,
            },
        });
    }

    async findMany(options?: {
        invitationType?: EnumInvitationType;
        contextId?: string;
        userId?: string;
        includeDeleted?: boolean;
    }): Promise<InvitationWithUser[]> {
        const where: Prisma.InvitationWhereInput = {
            ...(options?.includeDeleted ? {} : { deletedAt: null }),
            user: { deletedAt: null },
        };

        if (options?.userId) {
            where.userId = options.userId;
        }

        if (options?.invitationType) {
            where.invitationType = options.invitationType;
        }

        if (options?.contextId) {
            where.contextId = options.contextId;
        }

        return this.databaseService.invitation.findMany({
            where,
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findManyPendingByUserId(userId: string): Promise<InvitationWithUser[]> {
        const today = this.helperService.dateCreate();

        return this.databaseService.invitation.findMany({
            where: {
                userId,
                deletedAt: null,
                acceptedAt: null,
                expiresAt: {
                    gt: today,
                },
                user: {
                    deletedAt: null,
                },
            },
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async softDelete(id: string, deletedBy: string): Promise<Invitation> {
        const now = this.helperService.dateCreate();

        return this.databaseService.invitation.update({
            where: { id },
            data: {
                deletedAt: now,
                deletedBy,
                updatedBy: deletedBy,
            },
        });
    }

    async findTenantMemberForInvitation(
        client: Prisma.TransactionClient,
        userId: string,
        contextId: string,
        memberId?: string
    ): Promise<{ id: string; status: EnumTenantMemberStatus } | null> {
        return client.tenantMember.findFirst({
            where: {
                tenantId: contextId,
                userId,
                ...(memberId ? { id: memberId } : {}),
                tenant: {
                    deletedAt: null,
                },
            },
            select: {
                id: true,
                status: true,
            },
        });
    }

    async findProjectMemberForInvitation(
        client: Prisma.TransactionClient,
        userId: string,
        contextId: string,
        memberId?: string
    ): Promise<{ id: string; status: EnumProjectMemberStatus } | null> {
        return client.projectMember.findFirst({
            where: {
                projectId: contextId,
                userId,
                deletedAt: null,
                ...(memberId ? { id: memberId } : {}),
                project: {
                    deletedAt: null,
                },
            },
            select: {
                id: true,
                status: true,
            },
        });
    }

    async activatePendingTenantMember(
        client: Prisma.TransactionClient,
        userId: string,
        contextId: string,
        memberId?: string
    ): Promise<number> {
        const result = await client.tenantMember.updateMany({
            where: {
                tenantId: contextId,
                userId,
                ...(memberId ? { id: memberId } : {}),
                status: EnumTenantMemberStatus.pending,
                tenant: {
                    deletedAt: null,
                },
            },
            data: {
                status: EnumTenantMemberStatus.active,
                updatedBy: userId,
            },
        });

        return result.count;
    }

    async activatePendingProjectMember(
        client: Prisma.TransactionClient,
        userId: string,
        contextId: string,
        memberId?: string
    ): Promise<number> {
        const result = await client.projectMember.updateMany({
            where: {
                projectId: contextId,
                userId,
                deletedAt: null,
                ...(memberId ? { id: memberId } : {}),
                status: EnumProjectMemberStatus.pending,
                project: {
                    deletedAt: null,
                },
            },
            data: {
                status: EnumProjectMemberStatus.active,
                updatedBy: userId,
            },
        });

        return result.count;
    }

    async completeInvitation(
        client: Prisma.TransactionClient,
        invitationId: string,
        userId: string,
        name: string,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
            passwordPeriodExpired,
        }: IAuthPassword,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        const today = this.helperService.dateCreate();

        await client.invitation.update({
            where: {
                id: invitationId,
            },
            data: {
                acceptedAt: today,
                updatedBy: userId,
            },
        });

        await client.invitation.updateMany({
            where: {
                userId,
                deletedAt: null,
                acceptedAt: null,
                expiresAt: {
                    gt: today,
                },
            },
            data: {
                expiresAt: today,
                updatedBy: userId,
            },
        });

        return client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                name,
                password: passwordHash,
                passwordCreated,
                passwordExpired,
                passwordAttempt: 0,
                isVerified: true,
                verifiedAt: today,
                updatedBy: userId,
                passwordHistories: {
                    create: {
                        password: passwordHash,
                        type: EnumPasswordHistoryType.signUp,
                        expiredAt: passwordPeriodExpired,
                        createdAt: passwordCreated,
                        createdBy: userId,
                    },
                },
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userCompleteInvitation,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async acceptInvitation(
        client: Prisma.TransactionClient,
        invitationId: string,
        userId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<void> {
        const today = this.helperService.dateCreate();

        await client.invitation.update({
            where: { id: invitationId },
            data: {
                acceptedAt: today,
                updatedBy: userId,
            },
        });

        await client.invitation.updateMany({
            where: {
                userId,
                deletedAt: null,
                acceptedAt: null,
                expiresAt: { gt: today },
            },
            data: {
                expiresAt: today,
                updatedBy: userId,
            },
        });

        await client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userCompleteInvitation,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async createInvitation(
        userId: string,
        userEmail: string,
        invitationToken: {
            expiresAt: Date;
            reference: string;
            token: string;
        },
        context: {
            invitationType: EnumInvitationType;
            roleScope: EnumRoleScope;
            contextId: string;
            contextName: string;
            memberId: string;
            metadata?: Prisma.InputJsonValue;
        },
        requestedBy: string
    ): Promise<Invitation> {
        const today = this.helperService.dateCreate();

        return this.databaseService.$transaction(
            async (client: Prisma.TransactionClient) => {
                await client.invitation.updateMany({
                    where: {
                        userId,
                        deletedAt: null,
                        acceptedAt: null,
                        expiresAt: {
                            gt: today,
                        },
                    },
                    data: {
                        expiresAt: today,
                        updatedBy: requestedBy,
                    },
                });

                return client.invitation.create({
                    data: {
                        userId,
                        to: userEmail,
                        token: invitationToken.token,
                        reference: invitationToken.reference,
                        expiresAt: invitationToken.expiresAt,
                        acceptedAt: null,
                        sentAt: null,
                        invitationType: context.invitationType,
                        roleScope: context.roleScope,
                        contextId: context.contextId,
                        contextName: context.contextName,
                        memberId: context.memberId,
                        metadata: context.metadata,
                        deletedAt: null,
                        deletedBy: null,
                        createdBy: requestedBy,
                        createdAt: today,
                        updatedBy: requestedBy,
                    },
                });
            }
        );
    }

    async markInvitationAsSent(
        invitationId: string,
        userId: string,
        requestedBy: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const sentAt = this.helperService.dateCreate();

        await this.databaseService.$transaction(
            async (client: Prisma.TransactionClient) => {
                await Promise.all([
                    client.invitation.update({
                        where: { id: invitationId },
                        data: {
                            sentAt,
                            updatedBy: requestedBy,
                        },
                    }),
                    client.user.update({
                        where: { id: userId },
                        data: {
                            activityLogs: {
                                create: {
                                    action:
                                        EnumActivityLogAction.userSendInvitationEmail,
                                    ipAddress: requestLog.ipAddress,
                                    userAgent: this.databaseUtil.toPlainObject(
                                        requestLog.userAgent
                                    ),
                                    createdBy: requestedBy,
                                },
                            },
                        },
                    }),
                ]);
            }
        );
    }
}
