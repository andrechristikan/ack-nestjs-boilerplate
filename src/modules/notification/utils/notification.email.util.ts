import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationEmailSendPayload,
    INotificationEmailWorkerBulkPayload,
    INotificationEmailWorkerPayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
} from '@modules/notification/interfaces/notification.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from 'src/queues/enums/queue.enum';

@Injectable()
export class NotificationEmailUtil {
    constructor(
        @InjectQueue(EnumQueue.notificationEmail)
        private readonly emailQueue: Queue
    ) {}

    async sendWelcomeByAdmin(
        {
            email,
            username,
            userId,
            notificationId,
        }: INotificationEmailSendPayload,
        {
            passwordCreatedAt,
            passwordExpiredAt,
            password,
        }: INotificationWelcomeByAdminPayload
    ): Promise<void> {
        const payload: INotificationEmailWorkerPayload<INotificationWelcomeByAdminPayload> =
            {
                send: {
                    userId,
                    email,
                    username,
                    notificationId,
                },
                data: {
                    passwordCreatedAt,
                    passwordExpiredAt,
                    password,
                },
            };

        await this.emailQueue.add(
            EnumNotificationProcess.welcomeByAdmin,
            payload,
            {
                jobId: `${EnumNotificationProcess.welcomeByAdmin}-${userId}`,
                priority: EnumQueuePriority.low,
            }
        );
    }

    async sendTemporaryPasswordByAdmin(
        {
            email,
            username,
            userId,
            notificationId,
        }: INotificationEmailSendPayload,
        {
            password,
            passwordCreatedAt,
            passwordExpiredAt,
        }: INotificationTemporaryPasswordPayload
    ): Promise<void> {
        const payload: INotificationEmailWorkerPayload<INotificationTemporaryPasswordPayload> =
            {
                send: {
                    userId,
                    email,
                    username,
                    notificationId,
                },
                data: {
                    password,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
            };

        await this.emailQueue.add(
            EnumNotificationProcess.temporaryPasswordByAdmin,
            payload,
            {
                deduplication: {
                    id: `${EnumNotificationProcess.temporaryPasswordByAdmin}-${userId}`,
                    ttl: 1000,
                },
                priority: EnumQueuePriority.medium,
            }
        );
    }

    async sendResetPassword({
        email,
        username,
        userId,
        notificationId,
    }: INotificationEmailSendPayload): Promise<void> {
        const payload: INotificationEmailWorkerPayload = {
            send: {
                userId,
                email,
                username,
                notificationId,
            },
        };

        await this.emailQueue.add(
            EnumNotificationProcess.resetPassword,
            payload,
            {
                priority: EnumQueuePriority.low,
                deduplication: {
                    id: `${EnumNotificationProcess.resetPassword}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    async sendChangePassword({
        email,
        username,
        userId,
        notificationId,
    }: INotificationEmailSendPayload): Promise<void> {
        const payload: INotificationEmailWorkerPayload = {
            send: {
                userId,
                email,
                username,
                notificationId,
            },
        };

        await this.emailQueue.add(
            EnumNotificationProcess.changePassword,
            payload,
            {
                priority: EnumQueuePriority.low,
                deduplication: {
                    id: `${EnumNotificationProcess.changePassword}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    async sendVerificationEmail(
        {
            email,
            username,
            userId,
            notificationId,
        }: INotificationEmailSendPayload,
        {
            expiredAt,
            expiredInMinutes,
            link,
            reference,
        }: INotificationVerificationEmailPayload
    ): Promise<void> {
        const payload: INotificationEmailWorkerPayload<INotificationVerificationEmailPayload> =
            {
                send: {
                    userId,
                    email,
                    username,
                    notificationId,
                },
                data: {
                    expiredAt,
                    expiredInMinutes,
                    link,
                    reference,
                },
            };

        await this.emailQueue.add(
            EnumNotificationProcess.verificationEmail,
            payload,
            {
                jobId: `${EnumNotificationProcess.verificationEmail}-${userId}`,
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendWelcome({
        email,
        username,
        userId,
        notificationId,
    }: INotificationEmailSendPayload): Promise<void> {
        const payload: INotificationEmailWorkerPayload = {
            send: {
                userId,
                email,
                username,
                notificationId,
            },
        };

        await this.emailQueue.add(EnumNotificationProcess.welcome, payload, {
            jobId: `${EnumNotificationProcess.welcome}-${userId}`,
            priority: EnumQueuePriority.low,
        });
    }

    async sendVerifiedEmail(
        {
            email,
            username,
            userId,
            notificationId,
        }: INotificationEmailSendPayload,
        { reference }: INotificationVerifiedEmailPayload
    ): Promise<void> {
        const payload: INotificationEmailWorkerPayload<INotificationVerifiedEmailPayload> =
            {
                send: {
                    userId,
                    email,
                    username,
                    notificationId,
                },
                data: {
                    reference,
                },
            };

        await this.emailQueue.add(
            EnumNotificationProcess.verifiedEmail,
            payload,
            {
                jobId: `${EnumNotificationProcess.verifiedEmail}-${userId}`,
                priority: EnumQueuePriority.low,
            }
        );
    }

    async sendForgotPassword(
        {
            email,
            username,
            userId,
            notificationId,
        }: INotificationEmailSendPayload,
        {
            expiredAt,
            expiredInMinutes,
            link,
            reference,
            resendInMinutes,
        }: INotificationForgotPasswordPayload
    ): Promise<void> {
        const payload: INotificationEmailWorkerPayload<INotificationForgotPasswordPayload> =
            {
                send: {
                    userId,
                    email,
                    username,
                    notificationId,
                },
                data: {
                    expiredAt,
                    expiredInMinutes,
                    link,
                    reference,
                    resendInMinutes,
                },
            };

        await this.emailQueue.add(
            EnumNotificationProcess.forgotPassword,
            payload,
            {
                deduplication: {
                    id: `${EnumNotificationProcess.forgotPassword}-${userId}`,
                    ttl: resendInMinutes * 60 * 1000,
                },
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendVerifiedMobileNumber(
        {
            email,
            username,
            userId,
            notificationId,
        }: INotificationEmailSendPayload,
        {
            mobileNumber,
            reference,
            resendInMinutes,
        }: INotificationVerifiedMobileNumberPayload
    ): Promise<void> {
        const payload: INotificationEmailWorkerPayload<INotificationVerifiedMobileNumberPayload> =
            {
                send: {
                    userId,
                    email,
                    username,
                    notificationId,
                },
                data: {
                    mobileNumber,
                    reference,
                    resendInMinutes,
                },
            };

        await this.emailQueue.add(
            EnumNotificationProcess.verifiedMobileNumber,
            payload,
            {
                deduplication: {
                    id: `${EnumNotificationProcess.verifiedMobileNumber}-${userId}`,
                    ttl: resendInMinutes * 60 * 1000,
                },
                priority: EnumQueuePriority.low,
            }
        );
    }

    async sendResetTwoFactorByAdmin({
        email,
        username,
        userId,
        notificationId,
    }: INotificationEmailSendPayload): Promise<void> {
        const payload: INotificationEmailWorkerPayload = {
            send: {
                userId,
                email,
                username,
                notificationId,
            },
        };

        await this.emailQueue.add(
            EnumNotificationProcess.resetTwoFactorByAdmin,
            payload,
            {
                jobId: `${EnumNotificationProcess.resetTwoFactorByAdmin}-${userId}`,
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendNewDeviceLogin(
        {
            email,
            username,
            userId,
            notificationId,
        }: INotificationEmailSendPayload,
        {
            loginFrom,
            loginWith,
            loginAt,
            requestLog,
        }: INotificationNewDeviceLoginPayload
    ): Promise<void> {
        const payload: INotificationEmailWorkerPayload<INotificationNewDeviceLoginPayload> =
            {
                send: {
                    userId,
                    email,
                    username,
                    notificationId,
                },
                data: {
                    loginFrom,
                    loginWith,
                    loginAt,
                    requestLog,
                },
            };

        await this.emailQueue.add(
            EnumNotificationProcess.newDeviceLogin,
            payload,
            {
                deduplication: {
                    id: `${EnumNotificationProcess.newDeviceLogin}-${userId}`,
                    ttl: 1000,
                },
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendPublishTermPolicy(
        sendPayload: INotificationEmailSendPayload[],
        publishTermPolicy: INotificationPublishTermPolicyPayload
    ): Promise<void> {
        const payload: INotificationEmailWorkerBulkPayload<INotificationPublishTermPolicyPayload> =
            {
                send: sendPayload,
                data: publishTermPolicy,
            };

        await this.emailQueue.add(
            EnumNotificationProcess.publishTermPolicy,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.publishTermPolicy}-${publishTermPolicy.type}-${publishTermPolicy.version}`,
                    ttl: 1000,
                },
            }
        );
    }
}
