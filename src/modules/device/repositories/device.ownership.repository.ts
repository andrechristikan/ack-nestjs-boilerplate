import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
import { DeviceOwnershipRefSelect } from '@modules/device/constants/device.constant';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import { SessionRefSelect } from '@modules/session/constants/session.constant';
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
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    private ownershipInclude(
        today: Date,
        idleSince: Date
    ): Prisma.DeviceOwnershipInclude {
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
                            lastActiveAt: { gte: idleSince },
                        },
                    },
                },
            },
        };
    }

    private ownershipWithSessionInclude(
        today: Date,
        idleSince: Date,
        sessionId: string
    ): Prisma.DeviceOwnershipInclude {
        const ownershipInclude = this.ownershipInclude(today, idleSince);

        return {
            ...ownershipInclude,
            sessions: {
                where: { id: sessionId },
                take: 1,
                select: SessionRefSelect,
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
            select: DeviceOwnershipRefSelect,
        });
        const isNewOwnership = existing === null || existing.isRevoked;

        const deviceOwnership = await tx.deviceOwnership.upsert({
            where,
            update: {
                lastActiveAt: now,
                updatedBy: userId,
                ...(notificationToken !== null && {
                    notificationToken,
                    notificationProvider,
                }),
                ...(existing?.isRevoked === true && {
                    isRevoked: false,
                    revokedAt: null,
                    revokedById: null,
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
        now: Date,
        idleSince: Date
    ): Promise<IDeviceOwnership> {
        const include = this.ownershipInclude(now, idleSince);

        try {
            return await tx.deviceOwnership.update({
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
                include,
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new DeviceNotFoundException()
            );
        }
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
        { where, ...others }: IPaginationQueryOffsetParams,
        isRevoked: Record<string, IPaginationEqual> | null,
        idleSince: Date
    ): Promise<IResponsePaginationReturn<IDeviceOwnership>> {
        const today = this.helperDateService.now();
        const ownershipInclude = this.ownershipInclude(today, idleSince);

        return this.paginationService.offset(
            this.databaseService.client.deviceOwnership,
            {
                ...others,
                where: {
                    ...where,
                    ...isRevoked,
                    userId,
                },
                include: ownershipInclude,
            }
        );
    }

    async findActiveWithPaginationCursor(
        userId: string,
        sessionId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        idleSince: Date
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipWithSession>> {
        const today = this.helperDateService.now();
        const include = this.ownershipWithSessionInclude(
            today,
            idleSince,
            sessionId
        );

        return this.paginationService.cursor(
            this.databaseService.client.deviceOwnership,
            {
                ...others,
                where: {
                    ...where,
                    userId,
                    isRevoked: false,
                },
                include,
            }
        );
    }

    async findTokensByUserId(
        userId: string,
        now: Date,
        idleSince: Date
    ): Promise<string[]> {
        const rows = await this.databaseService.client.deviceOwnership.findMany(
            {
                where: {
                    userId,
                    isRevoked: false,
                    notificationToken: { not: null },
                    sessions: {
                        some: {
                            isRevoked: false,
                            expiredAt: { gt: now },
                            lastActiveAt: { gte: idleSince },
                        },
                    },
                },
                select: DeviceOwnershipRefSelect,
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
        { notificationToken }: IDeviceRefresh,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<string> {
        try {
            const ownership = await tx.deviceOwnership.update({
                where: {
                    id: deviceOwnershipId,
                    userId,
                    isRevoked: false,
                },
                data: {
                    lastActiveAt: now,
                    notificationToken,
                    notificationProvider,
                },
                select: DeviceOwnershipRefSelect,
            });

            return ownership.deviceId;
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new DeviceNotFoundException()
            );
        }
    }

    async touchInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        now: Date
    ): Promise<string | null> {
        try {
            const ownership = await tx.deviceOwnership.update({
                where: {
                    id: deviceOwnershipId,
                    userId,
                    isRevoked: false,
                },
                data: { lastActiveAt: now },
                select: DeviceOwnershipRefSelect,
            });

            return ownership.deviceId;
        } catch (error: unknown) {
            const isNotFound = this.databaseUtil.isRecordNotFound(error);
            if (isNotFound) {
                return null;
            }

            throw this.databaseUtil.toWriteException(
                error,
                new DeviceNotFoundException()
            );
        }
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

    async findOtherIdsByDeviceInTx(
        tx: IDatabaseTransactionClient,
        deviceId: string,
        userId: string
    ): Promise<string[]> {
        const ownerships = await tx.deviceOwnership.findMany({
            where: {
                deviceId,
                userId: { not: userId },
                isRevoked: false,
            },
            select: DeviceOwnershipRefSelect,
        });

        return ownerships.map(ownership => ownership.id);
    }

    async clearTokensInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        tokens: string[]
    ): Promise<void> {
        await tx.deviceOwnership.updateMany({
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

    async clearStaleTokens(thresholdInMs: number): Promise<number> {
        const today = this.helperDateService.now();
        const thresholdDate = this.helperDateService.backward(
            today,
            Duration.fromMillis(thresholdInMs)
        );

        const { count } =
            await this.databaseService.client.deviceOwnership.updateMany({
                where: {
                    notificationToken: { not: null },
                    lastActiveAt: { lt: thresholdDate },
                },
                data: {
                    notificationToken: null,
                    notificationProvider: null,
                },
            });

        return count;
    }
}
