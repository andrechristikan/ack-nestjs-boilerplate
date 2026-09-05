import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import { DeviceService } from '@modules/device/services/device.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import {
    INotificationEmailSendPayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationSendPushPayload,
    INotificationTemporaryPasswordPayload,
} from '@modules/notification/interfaces/notification.interface';
import { INotificationSecurityService } from '@modules/notification/interfaces/notification.security.service.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Writes and fans out the password, two-factor and new-device login notifications. */
@Injectable()
export class NotificationSecurityService implements INotificationSecurityService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly userService: UserService,
        private readonly deviceService: DeviceService,
        private readonly helperDateService: HelperDateService,
        private readonly requestContextService: RequestContextService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly notificationPushQueue: NotificationPushQueue
    ) {}

    async processTemporaryPasswordByAdmin(
        userId: string,
        proceedBy: string,
        data: INotificationTemporaryPasswordPayload
    ): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userService.getOneActive(userId),
            this.deviceService.getOwnershipsWithNotificationToken(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping temporary password by admin notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const promises = [
            this.notificationRepository.create(
                EnumNotificationKind.temporaryPasswordByAdmin,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: {
                        username: user.username,
                        passwordExpiredAt: this.helperDateService.createFromIso(
                            data.passwordExpiredAt
                        ),
                    },
                    createdBy: proceedBy,
                }
            ),
            this.notificationEmailQueue.sendTemporaryPasswordByAdmin(
                emailPayload,
                data
            ),
        ];

        if (devices.length > 0) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices
                    .map(d => d.device.notificationToken)
                    .filter((t): t is string => t !== null),
                username: user.username,
            };

            promises.push(
                this.notificationPushQueue.sendTemporaryPasswordByAdmin(
                    pushPayload,
                    data
                )
            );
        }

        const results = await Promise.allSettled(promises);

        return {
            message: 'Temporary password by admin notification processed',
            results,
        };
    }

    async processChangePassword(userId: string): Promise<IQueueResponse> {
        const user = await this.userService.getOneActive(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping change password notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const results = await Promise.allSettled([
            this.notificationRepository.create(
                EnumNotificationKind.changePassword,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: { username: user.username },
                    createdBy: user.id,
                }
            ),
            this.notificationEmailQueue.sendChangePassword(emailPayload),
        ]);

        return { message: 'Change password notification processed', results };
    }

    async processForgotPassword(
        userId: string,
        data: INotificationForgotPasswordPayload
    ): Promise<IQueueResponse> {
        const user = await this.userService.getOneActive(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping forgot password notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const results = await Promise.allSettled([
            this.notificationRepository.create(
                EnumNotificationKind.forgotPassword,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: { username: user.username },
                    createdBy: user.id,
                }
            ),
            this.notificationEmailQueue.sendForgotPassword(emailPayload, data),
        ]);

        return { message: 'Forgot password notification processed', results };
    }

    async processResetPassword(userId: string): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userService.getOneActive(userId),
            this.deviceService.getOwnershipsWithNotificationToken(userId),
        ]);

        if (!user) {
            return {
                message: 'User not found, skipping reset password notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const promises = [
            this.notificationRepository.create(
                EnumNotificationKind.resetPassword,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: { username: user.username },
                    createdBy: user.id,
                }
            ),
            this.notificationEmailQueue.sendResetPassword(emailPayload),
        ];

        if (devices.length > 0) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices
                    .map(d => d.device.notificationToken)
                    .filter((t): t is string => t !== null),
                username: user.username,
            };

            promises.push(
                this.notificationPushQueue.sendResetPassword(pushPayload)
            );
        }

        const results = await Promise.allSettled(promises);

        return { message: 'Reset password notification processed', results };
    }

    async processResetTwoFactorByAdmin(
        userId: string,
        proceedBy: string
    ): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userService.getOneActive(userId),
            this.deviceService.getOwnershipsWithNotificationToken(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping reset two factor by admin notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const promises = [
            this.notificationRepository.create(
                EnumNotificationKind.resetTwoFactorByAdmin,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: { username: user.username },
                    createdBy: proceedBy,
                }
            ),
            this.notificationEmailQueue.sendResetTwoFactorByAdmin(emailPayload),
        ];

        if (devices.length > 0) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices
                    .map(d => d.device.notificationToken)
                    .filter((t): t is string => t !== null),
                username: user.username,
            };

            promises.push(
                this.notificationPushQueue.sendResetTwoFactorByAdmin(
                    pushPayload
                )
            );
        }

        const results = await Promise.allSettled(promises);

        return {
            message: 'Reset two factor by admin notification processed',
            results,
        };
    }

    async processNewDeviceLogin(
        userId: string,
        data: INotificationNewDeviceLoginPayload
    ): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userService.getOneActive(userId),
            this.deviceService.getOwnershipsWithNotificationToken(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping new device login notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };
        const device = this.requestContextService.resolveDevice(
            data.requestLog.userAgent
        );
        const city = this.requestContextService.resolveCity(
            data.requestLog.geoLocation ?? undefined
        );

        const promises = [
            this.notificationRepository.create(
                EnumNotificationKind.newDeviceLogin,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: {
                        username: user.username,
                        loginFrom: data.loginFrom,
                        loginWith: data.loginWith,
                        device,
                        city,
                        loginAt: this.helperDateService.createFromIso(
                            data.loginAt
                        ),
                    },
                    createdBy: user.id,
                }
            ),
            this.notificationEmailQueue.sendNewDeviceLogin(emailPayload, data),
        ];

        if (devices.length > 0) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices
                    .map(d => d.device.notificationToken)
                    .filter((t): t is string => t !== null),
                username: user.username,
            };

            promises.push(
                this.notificationPushQueue.sendNewDeviceLogin(pushPayload, data)
            );
        }

        const results = await Promise.allSettled(promises);

        return { message: 'New device login notification processed', results };
    }
}
