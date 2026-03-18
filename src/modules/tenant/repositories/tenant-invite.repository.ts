import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumTenantInviteStatus,
    EnumTenantMemberStatus,
    Prisma,
    TenantInvite,
} from '@generated/prisma-client';

@Injectable()
export class TenantInviteRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperService: HelperService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async findOneById(id: string): Promise<TenantInvite | null> {
        return this.databaseService.tenantInvite.findFirst({ where: { id } });
    }

    async findOneByIdAndTenant(
        id: string,
        tenantId: string
    ): Promise<TenantInvite | null> {
        return this.databaseService.tenantInvite.findFirst({
            where: { id, tenantId },
        });
    }

    async findOneByToken(token: string): Promise<TenantInvite | null> {
        return this.databaseService.tenantInvite.findFirst({ where: { token } });
    }

    async findOneActiveByToken(token: string): Promise<TenantInvite | null> {
        const now = this.helperService.dateCreate();

        return this.databaseService.tenantInvite.findFirst({
            where: {
                token,
                status: EnumTenantInviteStatus.pending,
                expiresAt: { gt: now },
            },
        });
    }

    async findOnePendingByEmailAndTenant(
        invitedEmail: string,
        tenantId: string
    ): Promise<TenantInvite | null> {
        return this.databaseService.tenantInvite.findFirst({
            where: {
                invitedEmail,
                tenantId,
                status: EnumTenantInviteStatus.pending,
            },
            orderBy: {
                createdAt: EnumPaginationOrderDirectionType.desc,
            },
        });
    }

    async create(
        data: Prisma.TenantInviteUncheckedCreateInput
    ): Promise<TenantInvite> {
        return this.databaseService.tenantInvite.create({ data });
    }

    async revoke(inviteId: string, revokedById: string): Promise<void> {
        const now = this.helperService.dateCreate();

        await this.databaseService.tenantInvite.update({
            where: {
                id: inviteId,
                status: EnumTenantInviteStatus.pending,
            },
            data: {
                status: EnumTenantInviteStatus.revoked,
                revokedAt: now,
                revokedById,
                updatedBy: revokedById,
            },
        });
    }

    async accept(
        inviteId: string,
        acceptedById: string,
        requestLog: IRequestLog,
        pendingMemberId: string
    ): Promise<void> {
        const now = this.helperService.dateCreate();

        await this.databaseService.$transaction(async tx => {
            await tx.tenantInvite.update({
                where: { id: inviteId },
                data: {
                    status: EnumTenantInviteStatus.accepted,
                    acceptedAt: now,
                    updatedBy: acceptedById,
                },
            });

            await tx.tenantMember.update({
                where: { id: pendingMemberId },
                data: {
                    status: EnumTenantMemberStatus.active,
                    updatedBy: acceptedById,
                },
            });

            await tx.user.update({
                where: { id: acceptedById },
                data: {
                    activityLogs: {
                        create: {
                            action: EnumActivityLogAction.userCompleteInvite,
                            ipAddress: requestLog.ipAddress,
                            userAgent: this.databaseUtil.toPlainObject(
                                requestLog.userAgent
                            ),
                            createdBy: acceptedById,
                        },
                    },
                },
            });
        });
    }

    async signupAndAccept(
        inviteId: string,
        userId: string,
        pendingMemberId: string,
        name: string,
        {
            passwordHash,
            passwordExpired,
            passwordCreated,
            passwordPeriodExpired,
        }: IAuthPassword,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<void> {
        const now = this.helperService.dateCreate();

        await this.databaseService.$transaction(async tx => {
            await tx.tenantInvite.update({
                where: { id: inviteId },
                data: {
                    status: EnumTenantInviteStatus.accepted,
                    acceptedAt: now,
                    updatedBy: userId,
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: {
                    name,
                    password: passwordHash,
                    passwordCreated,
                    passwordExpired,
                    passwordAttempt: 0,
                    isVerified: true,
                    verifiedAt: now,
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

            await tx.tenantMember.update({
                where: { id: pendingMemberId },
                data: {
                    status: EnumTenantMemberStatus.active,
                    updatedBy: userId,
                },
            });
        });
    }

    async findWithPaginationOffset(
        tenantId: string,
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<
            Prisma.TenantInviteSelect,
            Prisma.TenantInviteWhereInput
        >
    ): Promise<IResponsePagingReturn<TenantInvite>> {
        return this.paginationService.offset<TenantInvite>(
            this.databaseService.tenantInvite,
            {
                ...params,
                where: {
                    ...where,
                    tenantId,
                },
            }
        );
    }
}
