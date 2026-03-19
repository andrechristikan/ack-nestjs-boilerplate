import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationEmailSendPayload,
    INotificationEmailWorkerBulkPayload,
    INotificationEmailWorkerPayload,
    INotificationForgotPasswordPayload,
    INotificationInvitePayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordPayload,
    INotificationTenantInviteEmailPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
} from '@modules/notification/interfaces/notification.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from 'src/queues/enums/queue.enum';

/**
 * Utility for queueing email notification jobs.
 * Enqueues various email notification types (welcome, password reset, verification) to the email queue
 * with appropriate priority levels and deduplication settings.
 */
@Injectable()
export class NotificationEmailUtil {
    constructor(
        @InjectQueue(EnumQueue.notificationEmail)
        private readonly emailQueue: Queue
    ) {}

    /**
     * Enqueues a welcome email with temporary password sent by admin.
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @param passwordData - Password data (plaintext password, created/expiry dates)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Enqueues a temporary password email sent by admin.
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @param passwordData - Temporary password data (password, created/expiry dates)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Enqueues a password reset confirmation email.
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Enqueues a password change confirmation email.
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Enqueues an email verification link email.
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @param verificationData - Verification link data (link, expiry dates, reference)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Enqueues a welcome email (post-signup notification).
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Enqueues a welcome email for social login users.
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Enqueues an email verification confirmation email.
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @param verifiedData - Reference of the verified email
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Enqueues a forgot password reset link email.
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @param forgotPasswordData - Reset link data (link, expiry dates, reference, resend time)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Enqueues a mobile number verification confirmation email.
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @param mobileData - Verified mobile number and reference
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Enqueues a 2FA reset notification email sent by admin.
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Enqueues a new device login alert email.
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @param loginData - Login details (device, IP, location, time)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Enqueues an invite email.
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @param inviteData - Invite payload (link, expiry, reference, inviteType, roleScope, contextName)
     * @returns Promise resolving when job is enqueued
     */
    async sendInvite(
        {
            email,
            username,
            userId,
            notificationId,
        }: INotificationEmailSendPayload,
        {
            link,
            expiredAt,
            expiredInMinutes,
            reference,
            inviteType,
            contextName,
        }: INotificationInvitePayload
    ): Promise<void> {
        const payload: INotificationEmailWorkerPayload<INotificationInvitePayload> =
            {
                send: {
                    userId,
                    email,
                    username,
                    notificationId,
                },
                data: {
                    link,
                    expiredAt,
                    expiredInMinutes,
                    reference,
                    inviteType,
                    contextName,
                },
            };

        await this.emailQueue.add(EnumNotificationProcess.projectInvite, payload, {
            jobId: `${EnumNotificationProcess.projectInvite}-${userId}`,
            priority: EnumQueuePriority.medium,
        });
    }

    /**
     * Enqueues a tenant invite email.
     *
     * @param sendPayload - Recipient info (userId, email, username, notificationId)
     * @param tenantInviteData - Tenant invite payload
     * @returns Promise resolving when job is enqueued
     */
    async sendTenantInvite(
        { email, username, userId, notificationId }: INotificationEmailSendPayload,
        { tenantName, token, expiresAt, role }: INotificationTenantInviteEmailPayload
    ): Promise<void> {
        const payload: INotificationEmailWorkerPayload<INotificationTenantInviteEmailPayload> =
            {
                send: {
                    userId,
                    email,
                    username,
                    notificationId,
                },
                data: {
                    tenantName,
                    token,
                    expiresAt,
                    role,
                },
            };

        await this.emailQueue.add(
            EnumNotificationProcess.tenantInvite,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.tenantInvite}-${email}`,
                    ttl: 1000,
                },
            }
        );
    }

    /**
     * Enqueues term policy publication notification emails to multiple recipients.
     *
     * @param sendPayload - Array of recipient info (userId, email, username, notificationId)
     * @param publishTermPolicy - Term policy publication data
     * @returns Promise resolving when job is enqueued
     */
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
