import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumActivityLogAction,
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
    User,
} from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import {
    IUserLogin,
    IUserLoginResult,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserSessionRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async login(
        userId: string,
        { fingerprint, name, notificationToken, platform }: DeviceRequestDto,
        { loginFrom, loginWith, sessionId, expiredAt, jti }: IUserLogin,
        action: EnumActivityLogAction,
        notificationProvider: EnumDeviceNotificationProvider | null,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<IUserLoginResult> {
        const today = this.helperDateService.create();
        const devicePlatform = platform ?? EnumDevicePlatform.web;

        return this.databaseService.client.$transaction(async tx => {
            const device = await tx.device.upsert({
                where: {
                    fingerprint,
                },
                update: {
                    name,
                    platform: devicePlatform,
                    notificationToken,
                    lastActiveAt: today,
                    notificationProvider,
                    updatedBy: userId,
                },
                create: {
                    fingerprint,
                    name,
                    platform: devicePlatform,
                    notificationToken,
                    lastActiveAt: today,
                    notificationProvider,
                    createdBy: userId,
                },
            });

            let isNewDevice = false;
            let sessionShouldBeInactive: { id: string }[] = [];
            let deviceOwnership = await tx.deviceOwnership.findFirst({
                where: {
                    deviceId: device.id,
                    userId,
                    isRevoked: false,
                },
            });
            if (!deviceOwnership) {
                isNewDevice = true;
                deviceOwnership = await tx.deviceOwnership.create({
                    data: {
                        userId,
                        createdBy: userId,
                        lastActiveAt: today,
                        isRevoked: false,
                        deviceId: device.id,
                    },
                });
            } else {
                const activeSessions = await tx.session.findMany({
                    where: {
                        deviceOwnershipId: deviceOwnership.id,
                        isRevoked: false,
                        expiredAt: { gte: today },
                    },
                });

                sessionShouldBeInactive = activeSessions.map(session => ({
                    id: session.id,
                }));

                [deviceOwnership] = await Promise.all([
                    tx.deviceOwnership.update({
                        where: { id: deviceOwnership.id },
                        data: {
                            lastActiveAt: today,
                            updatedBy: userId,
                        },
                    }),
                    tx.session.updateMany({
                        where: {
                            id: { in: activeSessions.map(s => s.id) },
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: today,
                            revokedById: userId,
                            updatedBy: userId,
                        },
                    }),
                ]);
            }

            const user = await tx.user.update({
                where: { id: userId, deletedAt: null },
                data: {
                    lastLoginAt: today,
                    lastIPAddress: ipAddress,
                    lastLoginFrom: loginFrom,
                    lastLoginWith: loginWith,
                    updatedBy: userId,
                    activityLogs: {
                        create: {
                            action,
                            description:
                                this.activityLogUtil.getDescription(action),
                            ipAddress,
                            userAgent:
                                this.databaseUtil.toPlainObject(userAgent),
                            geoLocation:
                                this.databaseUtil.toPlainObject(geoLocation),
                            createdBy: userId,
                        },
                    },
                    sessions: {
                        create: {
                            id: sessionId,
                            jti,
                            expiredAt,
                            isRevoked: false,
                            ipAddress,
                            deviceOwnershipId: deviceOwnership.id,
                            userAgent:
                                this.databaseUtil.toPlainObject(userAgent),
                            geoLocation:
                                this.databaseUtil.toPlainObject(geoLocation),
                            createdBy: userId,
                        },
                    },
                },
            });

            const result: IUserLoginResult = {
                device,
                deviceOwnership,
                isNewDevice,
                user,
                sessionShouldBeInactive,
            };

            return result;
        });
    }

    async refresh(
        userId: string,
        { loginFrom, loginWith, sessionId, jti }: IUserLogin,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        const today = this.helperDateService.create();

        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                lastLoginAt: today,
                lastIPAddress: ipAddress,
                lastLoginFrom: loginFrom,
                lastLoginWith: loginWith,
                updatedBy: userId,
                sessions: {
                    update: {
                        where: {
                            id: sessionId,
                        },
                        data: {
                            jti,
                        },
                    },
                },
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userRefreshToken,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userRefreshToken
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        const today = this.helperDateService.create();
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userLogout,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userLogout
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
                sessions: {
                    update: {
                        where: {
                            id: sessionId,
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: this.helperDateService.create(),
                            revokedBy: {
                                connect: {
                                    id: userId,
                                },
                            },
                            updatedBy: userId,
                            deviceOwnership: {
                                update: {
                                    where: {
                                        id: deviceOwnershipId,
                                    },
                                    data: {
                                        device: {
                                            update: {
                                                notificationToken: null,
                                                notificationProvider: null,
                                                lastActiveAt: today,
                                                updatedBy: userId,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }
}
