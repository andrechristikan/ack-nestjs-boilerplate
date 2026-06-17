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
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

/**
 * Enqueues email notification jobs onto the email queue, deduplicated per user.
 */
@Injectable()
export class NotificationEmailUtil {
    constructor(
        @InjectQueue(EnumQueue.notificationEmail)
        private readonly emailQueue: Queue
    ) {}

    /** Enqueues the admin-created welcome email carrying the temporary password. */
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
                deduplication: {
                    id: `${EnumNotificationProcess.welcomeByAdmin}-${userId}`,
                    ttl: 1000,
                },
                priority: EnumQueuePriority.medium,
            }
        );
    }

    /** Enqueues the admin-issued temporary password email. */
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

    /** Enqueues the password reset confirmation email. */
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

    /** Enqueues the password change confirmation email. */
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

    /** Enqueues the email verification link; the deduplication TTL matches the link lifetime so a resend is suppressed until expiry. */
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
                deduplication: {
                    id: `${EnumNotificationProcess.verificationEmail}-${userId}`,
                    ttl: expiredInMinutes * 60 * 1000,
                },
                priority: EnumQueuePriority.high,
            }
        );
    }

    /** Enqueues the post-signup welcome email. */
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
            deduplication: {
                id: `${EnumNotificationProcess.welcome}-${userId}`,
                ttl: 1000,
            },
            priority: EnumQueuePriority.low,
        });
    }

    /** Enqueues the welcome email for new social-login users. */
    async sendWelcomeSocial({
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
            EnumNotificationProcess.welcomeSocial,
            payload,
            {
                jobId: `${EnumNotificationProcess.welcomeSocial}-${userId}`,
                deduplication: {
                    id: `${EnumNotificationProcess.welcomeSocial}-${userId}`,
                    ttl: 1000,
                },
                priority: EnumQueuePriority.low,
            }
        );
    }

    /** Enqueues the email-verified confirmation email. */
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
                deduplication: {
                    id: `${EnumNotificationProcess.verifiedEmail}-${userId}`,
                    ttl: 1000,
                },
                priority: EnumQueuePriority.low,
            }
        );
    }

    /** Enqueues the forgot-password reset link; the deduplication TTL matches the resend window. */
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

    /** Enqueues the mobile-number-verified confirmation email. */
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
                jobId: `${EnumNotificationProcess.verifiedMobileNumber}-${userId}`,
                deduplication: {
                    id: `${EnumNotificationProcess.verifiedMobileNumber}-${userId}`,
                    ttl: resendInMinutes * 60 * 1000,
                },
                priority: EnumQueuePriority.low,
            }
        );
    }

    /** Enqueues the admin-triggered two-factor reset email. */
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
                deduplication: {
                    id: `${EnumNotificationProcess.resetTwoFactorByAdmin}-${userId}`,
                    ttl: 1000,
                },
                priority: EnumQueuePriority.high,
            }
        );
    }

    /** Enqueues the new-device login alert email. */
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

    /** Enqueues a bulk term-policy publication email for the given recipients. */
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
