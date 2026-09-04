import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import { EnumNotificationChannel } from '@generated/prisma-client';
import {
    INotificationNewDeviceLoginPayload,
    INotificationSendPushPayload,
    INotificationTemporaryPasswordPayload,
} from '@modules/notification/interfaces/notification.interface';
import { INotificationPushSecurityService } from '@modules/notification/interfaces/notification.push.security.service.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationPushUtil } from '@modules/notification/utils/notification.push.util';
import { Injectable } from '@nestjs/common';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Renders and delivers the password, two-factor and new-device login push messages. */
@Injectable()
export class NotificationPushSecurityService implements INotificationPushSecurityService {
    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly notificationRepository: NotificationRepository,
        private readonly messageService: MessageService,
        private readonly helperDateService: HelperDateService,
        private readonly requestContextService: RequestContextService,
        private readonly notificationPushUtil: NotificationPushUtil
    ) {}

    async processNewDeviceLogin(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        data: INotificationNewDeviceLoginPayload
    ): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping new login notification',
            };
        }

        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.push
        );
        if (!notification) {
            return {
                message:
                    'Notification not found, skipping new login notification',
            };
        }

        const device = this.requestContextService.resolveDevice(
            data.requestLog.userAgent
        );
        const city = this.requestContextService.resolveCity(
            data.requestLog.geoLocation ?? undefined
        );
        const loginAt = this.helperDateService.formatToRFC2822(
            this.helperDateService.createFromIso(data.loginAt)
        );
        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: { device, city, username, loginAt },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.allSettled([
            this.notificationPushUtil.sendCleanupTokens(
                userId,
                result.failureTokens
            ),
            this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                result.failureTokens
            ),
        ]);

        return {
            message: 'New login notification processed',
            result,
        };
    }

    async processResetTwoFactorByAdmin({
        notificationTokens,
        username,
        notificationId,
        userId,
    }: INotificationSendPushPayload): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping reset two-factor notification',
            };
        }

        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.push
        );
        if (!notification) {
            return {
                message:
                    'Notification not found, skipping reset two-factor notification',
            };
        }

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: { username },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.all([
            this.notificationPushUtil.sendCleanupTokens(
                userId,
                result.failureTokens
            ),
            this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                result.failureTokens
            ),
        ]);

        return {
            message: 'Reset two-factor notification processed',
            result,
        };
    }

    async processTemporaryPasswordByAdmin(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        data: INotificationTemporaryPasswordPayload
    ): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping temporary password notification',
            };
        }

        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.push
        );
        if (!notification) {
            return {
                message:
                    'Notification not found, skipping temporary password notification',
            };
        }

        const passwordExpiredAt = this.helperDateService.formatToRFC2822(
            this.helperDateService.createFromIso(data.passwordExpiredAt)
        );

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: { username, passwordExpiredAt },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.all([
            this.notificationPushUtil.sendCleanupTokens(
                userId,
                result.failureTokens
            ),
            this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                result.failureTokens
            ),
        ]);

        return {
            message: 'Temporary password notification processed',
            result,
        };
    }

    async processResetPassword({
        notificationTokens,
        username,
        notificationId,
        userId,
    }: INotificationSendPushPayload): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping reset password notification',
            };
        }

        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.push
        );
        if (!notification) {
            return {
                message:
                    'Notification not found, skipping reset password notification',
            };
        }

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: { username },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.all([
            this.notificationPushUtil.sendCleanupTokens(
                userId,
                result.failureTokens
            ),
            this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                result.failureTokens
            ),
        ]);

        return {
            message: 'Reset password notification processed',
            result,
        };
    }

    async processForgotPassword({
        notificationTokens,
        username,
        notificationId,
        userId,
    }: INotificationSendPushPayload): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping forgot password notification',
            };
        }

        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.push
        );
        if (!notification) {
            return {
                message:
                    'Notification not found, skipping forgot password notification',
            };
        }

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: { username },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.all([
            this.notificationPushUtil.sendCleanupTokens(
                userId,
                result.failureTokens
            ),
            this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                result.failureTokens
            ),
        ]);

        return {
            message: 'Forgot password notification processed',
            result,
        };
    }
}
