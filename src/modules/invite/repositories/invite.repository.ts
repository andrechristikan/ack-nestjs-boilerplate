import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import {
    IPaginationCursorReturn,
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumUserStatus,
    Invite,
    Prisma,
    User,
} from '@generated/prisma-client';
import {
    InviteCreate,
    InviteTokenCreate,
    InviteWithUser,
} from '@modules/invite/interfaces/invite.interface';

@Injectable()
export class InviteRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperService: HelperService,
        private readonly paginationService: PaginationService
    ) {}

    async findOneByToken(
        token: string,
        inviteType: string
    ): Promise<InviteWithUser | null> {
        return this.databaseService.invite.findFirst({
            where: {
                token,
                inviteType,
                user: {
                    deletedAt: null,
                },
            },
            include: {
                user: true,
            },
        });
    }

    async findOneActiveByToken(
        token: string,
        inviteType: string
    ): Promise<InviteWithUser | null> {
        const today = this.helperService.dateCreate();

        return this.databaseService.invite.findFirst({
            where: {
                token,
                inviteType,
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

    async findOneActiveById(id: string): Promise<InviteWithUser | null> {
        const today = this.helperService.dateCreate();

        return this.databaseService.invite.findFirst({
            where: {
                id,
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

    async findOneLatestActiveByUserAndContext(
        userId: string,
        inviteType: string,
        contextId: string
    ): Promise<Invite | null> {
        const today = this.helperService.dateCreate();

        return this.databaseService.invite.findFirst({
            where: {
                userId,
                inviteType,
                contextId,
                deletedAt: null,
                acceptedAt: null,
                expiresAt: {
                    gt: today,
                },
                user: {
                    deletedAt: null,
                    status: EnumUserStatus.active,
                },
            },
            orderBy: {
                createdAt: EnumPaginationOrderDirectionType.desc,
            },
        });
    }

    async findWithPaginationOffset(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<
            Prisma.InviteSelect,
            Prisma.InviteWhereInput
        >,
        inviteType?: Record<string, IPaginationEqual>,
        contextId?: Record<string, IPaginationEqual>,
        userId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<InviteWithUser>> {
        return this.paginationService.offset<
            InviteWithUser,
            Prisma.InviteSelect,
            Prisma.InviteWhereInput
        >(this.databaseService.invite, {
            ...params,
            where: {
                ...where,
                ...inviteType,
                ...contextId,
                ...userId,
                user: { deletedAt: null },
            },
            include: { user: true },
        });
    }

    async findWithPaginationCursor(
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<
            Prisma.InviteSelect,
            Prisma.InviteWhereInput
        >,
        inviteType?: Record<string, IPaginationEqual>,
        contextId?: Record<string, IPaginationEqual>,
        userId?: Record<string, IPaginationEqual>
    ): Promise<IPaginationCursorReturn<InviteWithUser>> {
        return this.paginationService.cursor<
            InviteWithUser,
            Prisma.InviteSelect,
            Prisma.InviteWhereInput
        >(this.databaseService.invite, {
            ...params,
            where: {
                ...where,
                ...inviteType,
                ...contextId,
                ...userId,
                user: { deletedAt: null },
            },
            include: { user: true },
        });
    }

    async softDelete(id: string, deletedBy: string): Promise<void> {
        const now = this.helperService.dateCreate();

        await this.databaseService.invite.updateMany({
            where: {
                id,
                expiresAt: { gt: now },
                user: { deletedAt: null },
            },
            data: {
                deletedAt: now,
                deletedBy,
                updatedBy: deletedBy,
            },
        });
    }

    async acceptInvite(
        inviteId: string,
        userId: string,
        { ipAddress, userAgent }: IRequestLog,
        lastTenantId?: string
    ): Promise<void> {
        const today = this.helperService.dateCreate();

        await this.databaseService.$transaction(
            async (client: Prisma.TransactionClient) => {
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
                        ...(lastTenantId ? { lastTenantId } : {}),
                        activityLogs: {
                            create: {
                                action: EnumActivityLogAction.userCompleteInvite,
                                ipAddress,
                                userAgent:
                                    this.databaseUtil.toPlainObject(userAgent),
                                createdBy: userId,
                            },
                        },
                    },
                });
            }
        );
    }

    async signupByInvite(
        inviteId: string,
        userId: string,
        name: string,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
            passwordPeriodExpired,
        }: IAuthPassword,
        { ipAddress, userAgent }: IRequestLog,
        lastTenantId?: string
    ): Promise<User> {
        const today = this.helperService.dateCreate();

        // FIXME: internal $transaction must be removed and replaced with a caller-supplied
        // tx when this method is invoked inside a service-level transaction
        // (called from claimInvite in tenant/project member services).
        return this.databaseService.$transaction(
            async (client: Prisma.TransactionClient) => {
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
                        ...(lastTenantId ? { lastTenantId } : {}),
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
                                userAgent:
                                    this.databaseUtil.toPlainObject(userAgent),
                                createdBy: userId,
                            },
                        },
                    },
                });
            }
        );
    }

    async createInvite(
        userEmail: string,
        {
            userId,
            inviteType,
            roleScope,
            contextId,
            contextName,
            memberId,
        }: InviteCreate,
        { token, reference, expiresAt }: InviteTokenCreate,
        requestedBy: string
    ): Promise<Invite> {
        const today = this.helperService.dateCreate();

        // FIXME: internal $transaction must be removed and replaced with a caller-supplied
        // tx when this method is invoked inside a service-level transaction.
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
                //TODO: Create ActivityLogs
                return client.invite.create({
                    data: {
                        userId,
                        to: userEmail,
                        token,
                        reference,
                        expiresAt,
                        acceptedAt: null,
                        sentAt: null,
                        inviteType,
                        roleScope,
                        contextId,
                        contextName,
                        memberId,
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

        // FIXME: internal $transaction must be removed and replaced with a caller-supplied
        // tx when this method is invoked inside a service-level transaction.
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
                                    action: EnumActivityLogAction.userSendInviteEmail,
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
