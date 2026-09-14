import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
    Prisma,
} from '@generated/prisma-client';
import {
    IDeviceIdentity,
    IDeviceLoginUpsert,
    IDeviceOwnership,
    IDeviceOwnershipWithDevice,
    IDeviceOwnershipWithSession,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { IDeviceOwnershipRepository } from '@modules/device/interfaces/device.ownership.repository.interface';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';

@Injectable()
export class DeviceOwnershipRepository implements IDeviceOwnershipRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly paginationService: PaginationService
    ) {}

    private ownershipInclude(today: Date): {
        device: true;
        user: { select: typeof UserRefSelect };
        revokedBy: { select: typeof UserRefSelect };
        _count: {
            select: {
                sessions: {
                    where: {
                        isRevoked: false;
                        expiredAt: { gt: Date };
                    };
                };
            };
        };
    } {
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

    async upsertForLoginInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { fingerprint, name, notificationToken, platform }: IDeviceIdentity,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<IDeviceLoginUpsert> {
        const devicePlatform = platform ?? EnumDevicePlatform.web;
        const device = await tx.device.upsert({
            where: {
                fingerprint,
            },
            update: {
                name,
                platform: devicePlatform,
                notificationToken,
                lastActiveAt: now,
                notificationProvider,
                updatedBy: userId,
            },
            create: {
                fingerprint,
                name,
                platform: devicePlatform,
                notificationToken,
                lastActiveAt: now,
                notificationProvider,
                createdBy: userId,
            },
        });

        const existing = await tx.deviceOwnership.findFirst({
            where: {
                deviceId: device.id,
                userId,
                isRevoked: false,
            },
        });
        if (!existing) {
            const deviceOwnership = await tx.deviceOwnership.create({
                data: {
                    userId,
                    createdBy: userId,
                    lastActiveAt: now,
                    isRevoked: false,
                    deviceId: device.id,
                },
            });

            return {
                device,
                deviceOwnership,
                isNewDevice: true,
            };
        }

        const deviceOwnership = await tx.deviceOwnership.update({
            where: { id: existing.id },
            data: {
                lastActiveAt: now,
                updatedBy: userId,
            },
        });

        return {
            device,
            deviceOwnership,
            isNewDevice: false,
        };
    }

    async clearNotificationInTx(
        tx: IDatabaseTransactionClient,
        deviceOwnershipId: string,
        userId: string,
        now: Date
    ): Promise<void> {
        await tx.deviceOwnership.update({
            where: { id: deviceOwnershipId },
            data: {
                device: {
                    update: {
                        notificationToken: null,
                        notificationProvider: null,
                        lastActiveAt: now,
                        updatedBy: userId,
                    },
                },
            },
        });
    }

    async removeOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        removedBy: string,
        now: Date
    ): Promise<IDeviceOwnership> {
        return tx.deviceOwnership.update({
            where: {
                id: deviceOwnershipId,
                userId,
            },
            data: {
                isRevoked: true,
                revokedAt: now,
                revokedBy: {
                    connect: {
                        id: removedBy,
                    },
                },
                updatedBy: removedBy,
                device: {
                    update: {
                        notificationToken: null,
                        notificationProvider: null,
                        lastActiveAt: now,
                        updatedBy: removedBy,
                    },
                },
            },
            include: this.ownershipInclude(now),
        });
    }

    async findWithPaginationOffsetByAdmin(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IDeviceOwnership>> {
        const today = this.helperDateService.create();

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
            include: {
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
            },
        });
    }

    async findActiveWithPaginationCursor(
        userId: string,
        sessionId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IDeviceOwnershipWithSession>> {
        const today = this.helperDateService.create();

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
                sessions: {
                    where: {
                        id: sessionId,
                    },
                    take: 1,
                },
            },
        });
    }

    async findTokensByUserId(
        userId: string
    ): Promise<IDeviceOwnershipWithDevice[]> {
        return this.databaseService.client.deviceOwnership.findMany({
            where: {
                userId,
                device: {
                    notificationToken: { not: null },
                },
            },
            include: {
                device: true,
            },
        });
    }

    async existsActive(
        userId: string,
        deviceOwnershipId: string
    ): Promise<boolean> {
        const count = await this.databaseService.client.deviceOwnership.count({
            where: {
                id: deviceOwnershipId,
                userId,
                isRevoked: false,
            },
        });

        return count > 0;
    }

    async refreshInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        { name, notificationToken, platform }: IDeviceRefresh,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<void> {
        await tx.deviceOwnership.update({
            where: {
                id: deviceOwnershipId,
                userId,
            },
            data: {
                lastActiveAt: now,
                device: {
                    update: {
                        name,
                        platform,
                        notificationProvider,
                        notificationToken,
                        lastActiveAt: now,
                    },
                },
            },
        });
    }

    async cleanupTokens(
        userId: string,
        tokens: string[]
    ): Promise<Prisma.BatchPayload> {
        const deviceIds =
            await this.databaseService.client.deviceOwnership.findMany({
                where: {
                    userId,
                    device: {
                        notificationToken: {
                            in: tokens,
                        },
                    },
                },
                select: {
                    deviceId: true,
                },
            });

        const deviceIdList = deviceIds.map(d => d.deviceId);

        return this.databaseService.client.device.updateMany({
            where: {
                id: {
                    in: deviceIdList,
                },
            },
            data: {
                notificationToken: null,
                notificationProvider: null,
                updatedBy: userId,
            },
        });
    }

    async cleanupStaleTokens(
        thresholdInMs: number
    ): Promise<Prisma.BatchPayload> {
        const today = this.helperDateService.create();
        const thresholdDate = this.helperDateService.backward(
            today,
            Duration.fromMillis(thresholdInMs)
        );

        return this.databaseService.client.device.updateMany({
            where: {
                notificationToken: {
                    not: null,
                },
                lastActiveAt: {
                    lt: thresholdDate,
                },
            },
            data: {
                notificationToken: null,
                notificationProvider: null,
            },
        });
    }
}
