import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { FirebaseStaleTokenThresholdInDays } from '@common/firebase/constants/firebase.constant';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    Device,
    DeviceOwnership,
    EnumActivityLogAction,
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
    Prisma,
} from '@generated/prisma-client';
import { DeviceRefreshRequestDto } from '@modules/device/dtos/requests/device.refresh.dto';
import { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';

@Injectable()
export class DeviceOwnershipRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperService: HelperService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async findWithPaginationOffsetByAdmin(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<
            Prisma.DeviceOwnershipSelect,
            Prisma.DeviceOwnershipWhereInput
        >,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IDeviceOwnership>> {
        const today = this.helperService.dateCreate();

        return this.paginationService.offset<
            IDeviceOwnership,
            Prisma.DeviceOwnershipSelect,
            Prisma.DeviceOwnershipWhereInput
        >(this.databaseService.deviceOwnership, {
            ...others,
            where: {
                ...where,
                ...isRevoked,
                userId,
            },
            include: {
                device: true,
                user: true,
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
        }: IPaginationQueryCursorParams<
            Prisma.DeviceOwnershipSelect,
            Prisma.DeviceOwnershipWhereInput
        >
    ): Promise<IResponsePagingReturn<IDeviceOwnership>> {
        const today = this.helperService.dateCreate();

        return this.paginationService.cursor<
            IDeviceOwnership,
            Prisma.DeviceOwnershipSelect,
            Prisma.DeviceOwnershipWhereInput
        >(this.databaseService.deviceOwnership, {
            ...others,
            where: {
                ...where,
                userId,
                isRevoked: false,
            },
            include: {
                device: true,
                user: true,
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
    ): Promise<(DeviceOwnership & { device: Device })[]> {
        return this.databaseService.deviceOwnership.findMany({
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

    async existActive(
        userId: string,
        deviceOwnershipId: string
    ): Promise<{ id: string } | null> {
        return this.databaseService.deviceOwnership.findUnique({
            where: {
                id: deviceOwnershipId,
                userId,
                isRevoked: false,
            },
            select: { id: true },
        });
    }

    async refresh(
        userId: string,
        deviceOwnershipId: string,
        { name, notificationToken, platform }: DeviceRefreshRequestDto,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<DeviceOwnership> {
        const today = this.helperService.dateCreate();

        let notificationProvider: EnumDeviceNotificationProvider | null = null;
        switch (platform) {
            case EnumDevicePlatform.android:
                notificationProvider = EnumDeviceNotificationProvider.fcm;
                break;
            case EnumDevicePlatform.ios:
                notificationProvider = EnumDeviceNotificationProvider.apns;
                break;
            default:
                notificationProvider = null;
                break;
        }

        const user = await this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                lastLoginAt: today,
                lastIPAddress: ipAddress,
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userDeviceRefresh,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
                deviceOwnerships: {
                    update: {
                        where: {
                            id: deviceOwnershipId,
                        },
                        data: {
                            device: {
                                update: {
                                    name,
                                    platform,
                                    notificationProvider,
                                    notificationToken,
                                    lastActiveAt: today,
                                },
                            },
                        },
                    },
                },
            },
            include: {
                deviceOwnerships: {
                    take: 1,
                    where: {
                        id: deviceOwnershipId,
                    },
                    include: {
                        device: true,
                        user: true,
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
                },
            },
        });

        return user.deviceOwnerships[0];
    }

    async remove(
        userId: string,
        deviceOwnershipId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog,
        removedBy: string
    ): Promise<IDeviceOwnership> {
        return this.databaseService.$transaction(
            async (tx: Prisma.TransactionClient) => {
                const today = this.helperService.dateCreate();
                const deviceOwnership = await tx.deviceOwnership.update({
                    where: {
                        id: deviceOwnershipId,
                        userId,
                    },
                    data: {
                        isRevoked: true,
                        revokedAt: today,
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
                                lastActiveAt: today,
                                updatedBy: removedBy,
                            },
                        },
                        sessions: {
                            updateMany: {
                                where: {
                                    isRevoked: false,
                                    expiredAt: {
                                        gt: today,
                                    },
                                    deviceOwnershipId: deviceOwnershipId,
                                },
                                data: {
                                    isRevoked: true,
                                    revokedAt: today,
                                    revokedById: removedBy,
                                    updatedBy: removedBy,
                                },
                            },
                        },
                        user: {
                            update: {
                                activityLogs: {
                                    create: {
                                        action: EnumActivityLogAction.userRemoveDevice,
                                        ipAddress,
                                        userAgent:
                                            this.databaseUtil.toPlainObject(
                                                userAgent
                                            ),
                                        geoLocation:
                                            this.databaseUtil.toPlainObject(
                                                geoLocation
                                            ),
                                        createdBy: removedBy,
                                    },
                                },
                            },
                        },
                    },
                    include: {
                        device: true,
                        user: true,
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

                return deviceOwnership;
            }
        );
    }

    async cleanupTokens(
        userId: string,
        tokens: string[]
    ): Promise<Prisma.BatchPayload> {
        const deviceIds = await this.databaseService.deviceOwnership.findMany({
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

        return this.databaseService.device.updateMany({
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
        thresholdInDays: number = FirebaseStaleTokenThresholdInDays
    ): Promise<Prisma.BatchPayload> {
        const today = this.helperService.dateCreate();
        const thresholdDate = this.helperService.dateBackward(
            today,
            Duration.fromObject({
                days: thresholdInDays,
            })
        );

        return this.databaseService.device.updateMany({
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
