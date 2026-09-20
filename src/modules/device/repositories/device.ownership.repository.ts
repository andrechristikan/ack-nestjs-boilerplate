import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type {
    IDeviceOwnership,
    IDeviceOwnershipLoginUpsert,
    IDeviceOwnershipWithDevice,
    IDeviceOwnershipWithSession,
} from '@modules/device/interfaces/device.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import type { IDeviceOwnershipRepository } from '@modules/device/interfaces/device.ownership-repository.interface';
import { Injectable } from '@nestjs/common';

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
        deviceId: string,
        now: Date
    ): Promise<IDeviceOwnershipLoginUpsert> {
        const existing = await tx.deviceOwnership.findFirst({
            where: {
                deviceId,
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
                    deviceId,
                },
            });

            return {
                deviceOwnership,
                isNewOwnership: true,
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
            deviceOwnership,
            isNewOwnership: false,
        };
    }

    async findLiveDeviceIdInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string
    ): Promise<string | null> {
        const ownership = await tx.deviceOwnership.findUnique({
            where: {
                id: deviceOwnershipId,
                userId,
                isRevoked: false,
            },
            select: {
                deviceId: true,
            },
        });

        return ownership?.deviceId ?? null;
    }

    async removeOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        removedBy: string,
        now: Date
    ): Promise<IDeviceOwnership> {
        const ownershipInclude = this.ownershipInclude(now);

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
            },
            include: ownershipInclude,
        });
    }

    async revokeAllByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        revokedBy: string,
        now: Date
    ): Promise<string[]> {
        const ownerships = await tx.deviceOwnership.findMany({
            where: {
                userId,
                isRevoked: false,
            },
            select: {
                id: true,
                deviceId: true,
            },
        });
        if (ownerships.length === 0) {
            return [];
        }

        await tx.deviceOwnership.updateMany({
            where: {
                id: { in: ownerships.map(ownership => ownership.id) },
                isRevoked: false,
            },
            data: {
                isRevoked: true,
                revokedAt: now,
                revokedById: revokedBy,
                updatedBy: revokedBy,
            },
        });

        return ownerships.map(ownership => ownership.deviceId);
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
                    select: {
                        id: true,
                    },
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
                isRevoked: false,
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

    async touchInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        now: Date
    ): Promise<string> {
        const ownership = await tx.deviceOwnership.update({
            where: {
                id: deviceOwnershipId,
                userId,
            },
            data: {
                lastActiveAt: now,
            },
            select: {
                deviceId: true,
            },
        });

        return ownership.deviceId;
    }

    async findDeviceIdsByUserAndTokens(
        userId: string,
        tokens: string[]
    ): Promise<string[]> {
        const ownerships =
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

        return ownerships.map(ownership => ownership.deviceId);
    }
}
