import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { FirebaseStaleTokenThresholdInDays } from '@common/firebase/constants/firebase.constant';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    Device,
    EnumActivityLogAction,
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
    Prisma,
} from '@generated/prisma-client';
import { DeviceDto } from '@modules/device/dtos/device.dto';
import { IDevice } from '@modules/device/interfaces/device.interface';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';

@Injectable()
export class DeviceRepository {
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
            Prisma.DeviceSelect,
            Prisma.DeviceWhereInput
        >
    ): Promise<IResponsePagingReturn<IDevice>> {
        const today = this.helperService.dateCreate();

        return this.paginationService.offset<
            IDevice,
            Prisma.DeviceSelect,
            Prisma.DeviceWhereInput
        >(this.databaseService.device, {
            ...others,
            where: {
                ...where,
                userId,
            },
            select: {
                user: true,
                _count: {
                    select: {
                        sessions: {
                            where: {
                                isRevoked: false,
                                revokedAt: null,
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

    async findWithPaginationCursor(
        userId: string,
        sessionId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<
            Prisma.DeviceSelect,
            Prisma.DeviceWhereInput
        >
    ): Promise<IResponsePagingReturn<IDevice>> {
        const today = this.helperService.dateCreate();

        return this.paginationService.cursor<
            IDevice,
            Prisma.DeviceSelect,
            Prisma.DeviceWhereInput
        >(this.databaseService.passwordHistory, {
            ...others,
            where: {
                ...where,
                userId,
            },
            select: {
                user: true,
                _count: {
                    select: {
                        sessions: {
                            where: {
                                isRevoked: false,
                                revokedAt: null,
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

    async findByUserId(
        userId: string,
        excludeFingerprint?: string[],
        shouldHaveToken?: boolean
    ): Promise<Device[]> {
        return this.databaseService.device.findMany({
            where: {
                userId,
                ...(excludeFingerprint &&
                    excludeFingerprint.length > 0 && {
                        fingerprint: { notIn: excludeFingerprint },
                    }),
                ...(shouldHaveToken && {
                    notificationToken: { not: null },
                }),
            },
        });
    }

    async exist(
        userId: string,
        deviceId: string
    ): Promise<{ id: string } | null> {
        return this.databaseService.device.findUnique({
            where: {
                id: deviceId,
                userId,
            },
            select: { id: true },
        });
    }

    async existByFingerprint(
        userId: string,
        fingerprint: string
    ): Promise<{ id: string } | null> {
        return this.databaseService.device.findUnique({
            where: {
                userId_fingerprint: {
                    userId,
                    fingerprint,
                },
            },
            select: { id: true },
        });
    }

    async refresh(
        userId: string,
        { fingerprint, name, notificationToken, platform }: DeviceDto,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<Device> {
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
                devices: {
                    update: {
                        where: {
                            userId_fingerprint: {
                                userId,
                                fingerprint,
                            },
                        },
                        data: {
                            name,
                            platform,
                            notificationProvider,
                            notificationToken,
                            lastActiveAt: today,
                        },
                    },
                },
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
            },
            include: {
                devices: {
                    take: 1,
                    where: {
                        userId,
                        fingerprint,
                    },
                },
            },
        });

        return user.devices[0];
    }

    async remove(
        userId: string,
        deviceId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog,
        removedBy: string
    ): Promise<IDevice> {
        return this.databaseService.$transaction(
            async (tx: Prisma.TransactionClient) => {
                const today = this.helperService.dateCreate();
                const device = await tx.device.update({
                    where: {
                        id: deviceId,
                        userId,
                    },
                    data: {
                        notificationToken: null,
                        notificationProvider: null,
                        lastActiveAt: today,
                        updatedBy: removedBy,
                    },
                    include: {
                        user: true,
                        _count: {
                            select: {
                                sessions: {
                                    where: {
                                        isRevoked: false,
                                        revokedAt: null,
                                        expiredAt: {
                                            gt: today,
                                        },
                                    },
                                },
                            },
                        },
                    },
                });

                await Promise.all([
                    tx.session.updateMany({
                        where: {
                            device: {
                                id: deviceId,
                            },
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: today,
                            updatedBy: removedBy,
                        },
                    }),
                    tx.activityLog.create({
                        data: {
                            userId,
                            action: EnumActivityLogAction.userRemoveDevice,
                            ipAddress,
                            userAgent:
                                this.databaseUtil.toPlainObject(userAgent),
                            geoLocation:
                                this.databaseUtil.toPlainObject(geoLocation),
                            createdBy: removedBy,
                        },
                    }),
                ]);

                return device;
            }
        );
    }

    async cleanupTokensByIds(
        userId: string,
        deviceIds: string[]
    ): Promise<Prisma.BatchPayload> {
        return this.databaseService.device.updateMany({
            where: {
                id: {
                    in: deviceIds,
                },
                userId,
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
