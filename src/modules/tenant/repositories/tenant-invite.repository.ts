import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumTenantInviteStatus,
    EnumTenantMemberRole,
    EnumTenantMemberStatus,
    Prisma,
    TenantInvite,
} from '@generated/prisma-client';
import { ITenantInviteCreate } from '@modules/tenant/interfaces/tenant.interface';

@Injectable()
export class TenantInviteRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperService: HelperService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async findOnePendingByEmailAndTenant(
        email: string,
        tenantId: string
    ): Promise<TenantInvite | null> {
        return this.databaseService.tenantInvite.findFirst({
            where: {
                invitedEmail: email,
                tenantId,
                status: EnumTenantInviteStatus.pending,
            },
        });
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

    async findOneByIdAndTenant(
        id: string,
        tenantId: string
    ): Promise<TenantInvite | null> {
        return this.databaseService.tenantInvite.findFirst({
            where: { id, tenantId },
        });
    }

    async findOneByToken(token: string): Promise<TenantInvite | null> {
        return this.databaseService.tenantInvite.findFirst({
            where: { token },
        });
    }

    async create(data: ITenantInviteCreate): Promise<TenantInvite> {
        return this.databaseService.tenantInvite.create({ data });
    }

    async revoke(id: string, revokedById: string): Promise<void> {
        const now = this.helperService.dateCreate();
        await this.databaseService.tenantInvite.updateMany({
            where: { id },
            data: {
                status: EnumTenantInviteStatus.revoked,
                revokedAt: now,
                revokedById,
                updatedBy: revokedById,
            },
        });
    }

    async acceptAndCreateMembership(
        inviteId: string,
        userId: string,
        tenantId: string,
        role: EnumTenantMemberRole,
        _requestLog: IRequestLog
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

            await tx.tenantMember.create({
                data: {
                    tenantId,
                    userId,
                    role,
                    status: EnumTenantMemberStatus.active,
                    createdBy: userId,
                    updatedBy: userId,
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: { lastTenantId: tenantId, updatedBy: userId },
            });
        });
    }

    async signupAndAccept(
        inviteId: string,
        userId: string,
        tenantId: string,
        role: EnumTenantMemberRole,
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
                    lastTenantId: tenantId,
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

            await tx.tenantMember.create({
                data: {
                    tenantId,
                    userId,
                    role,
                    status: EnumTenantMemberStatus.active,
                    createdBy: userId,
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
