import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    Device,
    EnumActivityLogAction,
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client';
import { DeviceDto } from '@modules/device/dtos/device.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperService: HelperService
    ) {}

    async findByUserId(
        userId: string,
        excludeFingerprint?: string[]
    ): Promise<Device[]> {
        return this.databaseService.device.findMany({
            where: {
                userId,
                ...(excludeFingerprint &&
                    excludeFingerprint.length > 0 && {
                        fingerprint: { notIn: excludeFingerprint },
                    }),
            },
        });
    }

    async exist(
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
                        userAgent,
                        geoLocation,
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
}
