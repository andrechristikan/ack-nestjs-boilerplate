import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { EnumDeviceNotificationProvider } from '@generated/prisma-client/client';
import {
    DeviceOwnershipDeviceIdSelect,
    DeviceOwnershipNotificationTokenSelect,
    DeviceOwnershipRevokedSelect,
    DeviceOwnershipSessionIdSelect,
} from '@modules/device/constants/device.constant';
import type {
    IDeviceOwnership,
    IDeviceOwnershipLoginUpsert,
    IDeviceOwnershipWithSession,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import type { IDeviceOwnershipRepository } from '@modules/device/interfaces/device.ownership-repository.interface';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';

@Injectable()
export class DeviceOwnershipRepository implements IDeviceOwnershipRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly paginationService: PaginationService
    ) {}

    private ownershipInclude(today: Date): Prisma.DeviceOwnershipInclude {
        return {
            device: true,
            user: {
                select: UserRefSelect,
            },
            revokedBy: {
                select: UserRefSelect,
            },
            _count: {
                select: {
                    sessions: {
                        where: {
                            isRevoked: false,
                            expiredAt: {
                                gt: today,
                            },
                        },
                    },
                },
            },
        };
    }

    async upsertActiveInTx(
        tx: IDatabaseTransactionClient,
        deviceId: string,
        userId: string,
        notificationToken: string | null,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<IDeviceOwnershipLoginUpsert> {
        const where = { deviceId_userId: { deviceId, userId } };
        const existing = await tx.deviceOwnership.findUnique({
            where,
            select: DeviceOwnershipRevokedSelect,
        });
        const isNewOwnership = existing === null || existing.isRevoked;

        const deviceOwnership = await tx.deviceOwnership.upsert({
            where,
            update: {
                lastActiveAt: now,
                notificationProvider,
                updatedBy: userId,
                ...(notificationToken !== null && { notificationToken }),
                ...(existing?.isRevoked === true && {
                    isRevoked: false,
                    revokedAt: null,
                    revokedById: null,
                    biometricEnabled: false,
                    biometricToken: null,
                    biometricType: null,
                    biometricEnabledAt: null,
                }),
            },
            create: {
                userId,
                deviceId,
                createdBy: userId,
                lastActiveAt: now,
                isRevoked: false,
                notificationToken,
                notificationProvider,
            },
        });

        return { deviceOwnership, isNewOwnership };
    }

    async clearNotificationInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        updatedBy: string,
        now: Date
    ): Promise<boolean> {
        const { count } = await tx.deviceOwnership.updateMany({
            where: {
                id: deviceOwnershipId,
                userId,
                isRevoked: false,
            },
            data: {
                notificationToken: null,
                notificationProvider: null,
                lastActiveAt: now,
                updatedBy,
            },
        });

        return count > 0;
    }

    async removeOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        removedBy: string,
        now: Date
    ): Promise<IDeviceOwnership | null> {
        const { count } = await tx.deviceOwnership.updateMany({
            where: {
                id: deviceOwnershipId,
                userId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
                revokedAt: now,
                revokedById: removedBy,
                notificationToken: null,
                notificationProvider: null,
            },
        });
        if (count === 0) {
            return null;
        }

        const ownershipInclude = this.ownershipInclude(now);

        return tx.deviceOwnership.findUnique({
            where: { id: deviceOwnershipId },
            include: ownershipInclude,
        });
    }

    async revokeAllByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        revokedBy: string,
        now: Date
    ): Promise<void> {
        await tx.deviceOwnership.updateMany({
            where: {
                userId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
                revokedAt: now,
                revokedById: revokedBy,
                notificationToken: null,
                notificationProvider: null,
                updatedBy: revokedBy,
            },
        });
    }

    async findWithPaginationOffsetByAdmin(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        isRevoked: Record<string, IPaginationEqual> | null
    ): Promise<IResponsePaginationReturn<IDeviceOwnership>> {
        const today = this.helperDateService.create();
        const ownershipInclude = this.ownershipInclude(today);

        return this.paginationService.offset<
            IDeviceOwnership,
            Prisma.DeviceOwnershipWhereInput
        >(this.databaseService.client.deviceOwnership, {
            ...others,
            where: {
                ...where,
                ...isRevoked,
                userId,
            },
            include: ownershipInclude,
        });
    }

    async findActiveWithPaginationCursor(
        userId: string,
        sessionId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipWithSession>> {
        const today = this.helperDateService.create();
        const ownershipInclude = this.ownershipInclude(today);

        return this.paginationService.cursor<
            IDeviceOwnershipWithSession,
            Prisma.DeviceOwnershipWhereInput
        >(this.databaseService.client.deviceOwnership, {
            ...others,
            where: {
                ...where,
                userId,
                isRevoked: false,
            },
            include: {
                ...ownershipInclude,
                sessions: {
                    where: {
                        id: sessionId,
                    },
                    take: 1,
                    select: DeviceOwnershipSessionIdSelect,
                },
            },
        });
    }

    async findTokensByUserId(userId: string): Promise<string[]> {
        const rows = await this.databaseService.client.deviceOwnership.findMany(
            {
                where: {
                    userId,
                    isRevoked: false,
                    notificationToken: { not: null },
                },
                select: DeviceOwnershipNotificationTokenSelect,
            }
        );

        return rows.flatMap(({ notificationToken }) =>
            notificationToken === null ? [] : [notificationToken]
        );
    }

    async refreshInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        { notificationToken, platform }: IDeviceRefresh,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<string | null> {
        const { count } = await tx.deviceOwnership.updateMany({
            where: {
                id: deviceOwnershipId,
                userId,
                isRevoked: false,
            },
            data: {
                lastActiveAt: now,
                ...(platform !== null && { notificationProvider }),
                ...(notificationToken !== null && { notificationToken }),
            },
        });
        if (count === 0) {
            return null;
        }

        const ownership = await tx.deviceOwnership.findUnique({
            where: { id: deviceOwnershipId },
            select: DeviceOwnershipDeviceIdSelect,
        });

        return ownership?.deviceId ?? null;
    }

    async clearTokenFromOtherUsersInTx(
        tx: IDatabaseTransactionClient,
        notificationToken: string,
        userId: string
    ): Promise<void> {
        await tx.deviceOwnership.updateMany({
            where: {
                notificationToken,
                userId: { not: userId },
            },
            data: {
                notificationToken: null,
                notificationProvider: null,
                updatedBy: userId,
            },
        });
    }

    async clearTokens(
        userId: string,
        tokens: string[]
    ): Promise<Prisma.BatchPayload> {
        return this.databaseService.client.deviceOwnership.updateMany({
            where: {
                userId,
                notificationToken: { in: tokens },
            },
            data: {
                notificationToken: null,
                notificationProvider: null,
                updatedBy: userId,
            },
        });
    }

    async clearStaleTokens(
        thresholdInMs: number
    ): Promise<Prisma.BatchPayload> {
        const today = this.helperDateService.create();
        const thresholdDate = this.helperDateService.backward(
            today,
            Duration.fromMillis(thresholdInMs)
        );

        return this.databaseService.client.deviceOwnership.updateMany({
            where: {
                notificationToken: { not: null },
                lastActiveAt: { lt: thresholdDate },
            },
            data: {
                notificationToken: null,
                notificationProvider: null,
            },
        });
    }
}
