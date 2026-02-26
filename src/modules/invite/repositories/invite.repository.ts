import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumInviteType,
    EnumPasswordHistoryType,
    EnumProjectMemberStatus,
    EnumTenantMemberStatus,
    EnumUserStatus,
    Invite,
    Prisma,
    User,
} from '@prisma/client';
import {
    IInviteCreate,
    InviteWithUser,
} from '@modules/invite/interfaces/invite.interface';

@Injectable()
export class InviteRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperService: HelperService
    ) {}

    async findOneByToken(token: string): Promise<InviteWithUser | null> {
        return this.databaseService.invite.findFirst({
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

    async findOneActiveByToken(token: string): Promise<InviteWithUser | null> {
        const today = this.helperService.dateCreate();

        return this.databaseService.invite.findFirst({
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

    async findOneLatestActiveByUserId(userId: string): Promise<Invite | null> {
        const today = this.helperService.dateCreate();

        return this.databaseService.invite.findFirst({
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
        invitationType: EnumInviteType,
        contextId: string
    ): Promise<Invite | null> {
        const today = this.helperService.dateCreate();

        return this.databaseService.invite.findFirst({
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
        invitationType?: EnumInviteType;
        contextId?: string;
        userId?: string;
        includeDeleted?: boolean;
        pendingOnly?: boolean;
    }): Promise<InviteWithUser[]> {
        const today = this.helperService.dateCreate();
        const where: Prisma.InviteWhereInput = {
            ...(options?.includeDeleted ? {} : { deletedAt: null }),
            user: { deletedAt: null },
            ...(options?.pendingOnly
                ? {
                      acceptedAt: null,
                      expiresAt: {
                          gt: today,
                      },
                  }
                : {}),
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

        return this.databaseService.invite.findMany({
            where,
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async softDelete(id: string, deletedBy: string): Promise<Invite> {
        const now = this.helperService.dateCreate();

        return this.databaseService.invite.update({
            where: { id },
            data: {
                deletedAt: now,
                deletedBy,
                updatedBy: deletedBy,
            },
        });
    }

    async findTenantMemberForInvite(
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

    async findProjectMemberForInvite(
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

    async completeInvite(
        client: Prisma.TransactionClient,
        inviteId: string,
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

        await client.invite.update({
            where: {
                id: inviteId,
            },
            data: {
                acceptedAt: today,
                updatedBy: userId,
            },
        });

        await client.invite.updateMany({
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
                        action: EnumActivityLogAction.userCompleteInvite,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async acceptInvite(
        client: Prisma.TransactionClient,
        inviteId: string,
        userId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<void> {
        const today = this.helperService.dateCreate();

        await client.invite.update({
            where: { id: inviteId },
            data: {
                acceptedAt: today,
                updatedBy: userId,
            },
        });

        await client.invite.updateMany({
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
                        action: EnumActivityLogAction.userCompleteInvite,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async createInvite(
        {
            userId,
            userEmail,
            token,
            reference,
            expiresAt,
            invitationType,
            roleScope,
            contextId,
            contextName,
            memberId,
            metadata,
            requestedBy,
        }: IInviteCreate
    ): Promise<Invite> {
        const today = this.helperService.dateCreate();

        return this.databaseService.$transaction(
            async (client: Prisma.TransactionClient) => {
                await client.invite.updateMany({
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

                return client.invite.create({
                    data: {
                        userId,
                        to: userEmail,
                        token,
                        reference,
                        expiresAt,
                        acceptedAt: null,
                        sentAt: null,
                        invitationType,
                        roleScope,
                        contextId,
                        contextName,
                        memberId,
                        metadata,
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

    async markInviteSent(
        inviteId: string,
        userId: string,
        requestedBy: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const sentAt = this.helperService.dateCreate();

        await this.databaseService.$transaction(
            async (client: Prisma.TransactionClient) => {
                await Promise.all([
                    client.invite.update({
                        where: { id: inviteId },
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
                                        EnumActivityLogAction.userSendInviteEmail,
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
