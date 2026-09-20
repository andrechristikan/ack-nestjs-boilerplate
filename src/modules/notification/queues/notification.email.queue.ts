import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailBulkQueuePayload,
    INotificationEmailQueuePayload,
    INotificationEmailSendPayload,
    INotificationEmailUnregisteredQueuePayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordEncryptedPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminEncryptedPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceInviteUnregisteredEncryptedPayload,
    INotificationWorkspaceInviteUnregisteredPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

/**
 * Enqueues email notification jobs onto the email queue, deduplicated per user.
 */
@Injectable()
export class NotificationEmailQueue {
    private readonly dedupTtlInMs: number;
    private readonly verificationExpiredInMs: number;
    private readonly verificationResendInMs: number;
    private readonly forgotPasswordResendInMs: number;
    private readonly encryptionSecretKey: string;

    constructor(
        @InjectQueue(EnumQueue.notificationEmail)
        private readonly emailQueue: Queue,
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService
    ) {
        this.dedupTtlInMs = this.configService.get<number>(
            'notification.dedupTtlInMs'
        )!;
        this.verificationExpiredInMs = this.configService.get<number>(
            'verification.expiredInMs'
        )!;
        this.verificationResendInMs = this.configService.get<number>(
            'verification.resendInMs'
        )!;
        this.forgotPasswordResendInMs = this.configService.get<number>(
            'forgotPassword.resendInMs'
        )!;
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;
    }

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
            encryptedPassword,
        }: INotificationWelcomeByAdminEncryptedPayload
    ): Promise<void> {
        const payload: INotificationEmailQueuePayload<INotificationWelcomeByAdminEncryptedPayload> =
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
                    encryptedPassword,
                },
            };

        await this.emailQueue.add(
            EnumNotificationProcess.welcomeByAdmin,
            payload,
            {
                jobId: `${EnumNotificationProcess.welcomeByAdmin}-${userId}`,
                deduplication: {
                    id: `${EnumNotificationProcess.welcomeByAdmin}-${userId}`,
                    ttl: this.dedupTtlInMs,
                },
                priority: EnumQueuePriority.medium,
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
            encryptedPassword,
            passwordCreatedAt,
            passwordExpiredAt,
        }: INotificationTemporaryPasswordEncryptedPayload
    ): Promise<void> {
        const payload: INotificationEmailQueuePayload<INotificationTemporaryPasswordEncryptedPayload> =
            {
                send: {
                    userId,
                    email,
                    username,
                    notificationId,
                },
                data: {
                    encryptedPassword,
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
                    ttl: this.dedupTtlInMs,
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
        const payload: INotificationEmailQueuePayload = {
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
                    ttl: this.dedupTtlInMs,
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
        const payload: INotificationEmailQueuePayload = {
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
                    ttl: this.dedupTtlInMs,
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
            encryptedLink,
            reference,
        }: INotificationVerificationEmailEncryptedPayload
    ): Promise<void> {
        const payload: INotificationEmailQueuePayload<INotificationVerificationEmailEncryptedPayload> =
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
                    encryptedLink,
                    reference,
                },
            };

        await this.emailQueue.add(
            EnumNotificationProcess.verificationEmail,
            payload,
            {
                deduplication: {
                    id: `${EnumNotificationProcess.verificationEmail}-${userId}`,
                    ttl: this.verificationExpiredInMs,
                },
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
        const payload: INotificationEmailQueuePayload = {
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
                ttl: this.dedupTtlInMs,
            },
            priority: EnumQueuePriority.low,
        });
    }

    async sendWelcomeSocial({
        email,
        username,
        userId,
        notificationId,
    }: INotificationEmailSendPayload): Promise<void> {
        const payload: INotificationEmailQueuePayload = {
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
                    ttl: this.dedupTtlInMs,
                },
                priority: EnumQueuePriority.low,
            }
        );
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
        const payload: INotificationEmailQueuePayload<INotificationVerifiedEmailPayload> =
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
                    ttl: this.dedupTtlInMs,
                },
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
            encryptedLink,
            reference,
            resendInMinutes,
        }: INotificationForgotPasswordEncryptedPayload
    ): Promise<void> {
        const payload: INotificationEmailQueuePayload<INotificationForgotPasswordEncryptedPayload> =
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
                    encryptedLink,
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
                    ttl: this.forgotPasswordResendInMs,
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
        const payload: INotificationEmailQueuePayload<INotificationVerifiedMobileNumberPayload> =
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
                    ttl: this.verificationResendInMs,
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
        const payload: INotificationEmailQueuePayload = {
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
                    ttl: this.dedupTtlInMs,
                },
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
        const payload: INotificationEmailQueuePayload<INotificationNewDeviceLoginPayload> =
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
                    ttl: this.dedupTtlInMs,
                },
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendPublishTermPolicy(
        sendPayload: INotificationEmailSendPayload[],
        publishTermPolicy: INotificationPublishTermPolicyPayload
    ): Promise<void> {
        const payload: INotificationEmailBulkQueuePayload<INotificationPublishTermPolicyPayload> =
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
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    /** Enqueues the workspace invite email for a registered invitee (has `userId`); called by the main notification processor after the `Notification` row is created. */
    async sendWorkspaceInvite(
        sendPayload: INotificationEmailSendPayload,
        data: INotificationWorkspaceInviteEncryptedPayload
    ): Promise<void> {
        const payload: INotificationEmailQueuePayload<INotificationWorkspaceInviteEncryptedPayload> =
            {
                send: sendPayload,
                data,
            };

        await this.emailQueue.add(
            EnumNotificationProcess.workspaceInvite,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationProcess.workspaceInvite}-${data.reference}`,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    /** Enqueues the workspace invite email directly for an unregistered invitee (no `userId`, no `Notification` row); the link is sealed to the invite reference. */
    async sendWorkspaceInviteUnregistered(
        email: string,
        {
            inviteAcceptLink,
            ...invite
        }: INotificationWorkspaceInviteUnregisteredPayload
    ): Promise<void> {
        const encryptedInviteAcceptLink =
            this.helperEncryptionService.aes256Encrypt(
                inviteAcceptLink,
                this.encryptionSecretKey,
                NotificationPayloadEncryptionPurpose,
                invite.reference
            );
        const payload: INotificationEmailUnregisteredQueuePayload<INotificationWorkspaceInviteUnregisteredEncryptedPayload> =
            {
                send: { email },
                data: {
                    ...invite,
                    encryptedInviteAcceptLink,
                },
            };

        await this.emailQueue.add(
            EnumNotificationProcess.workspaceInviteUnregistered,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationProcess.workspaceInviteUnregistered}-${invite.reference}`,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendWorkspaceJoinRequest(
        sendPayload: INotificationEmailSendPayload,
        data: INotificationWorkspaceJoinRequestEncryptedPayload
    ): Promise<void> {
        const payload: INotificationEmailQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload> =
            {
                send: sendPayload,
                data,
            };

        await this.emailQueue.add(
            EnumNotificationProcess.workspaceJoinRequest,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.workspaceJoinRequest}-${data.workspaceId}-${sendPayload.userId}`,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendWorkspaceJoinAccepted(
        sendPayload: INotificationEmailSendPayload,
        data: INotificationWorkspaceJoinAcceptedPayload
    ): Promise<void> {
        const payload: INotificationEmailQueuePayload<INotificationWorkspaceJoinAcceptedPayload> =
            {
                send: sendPayload,
                data,
            };

        await this.emailQueue.add(
            EnumNotificationProcess.workspaceJoinAccepted,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.workspaceJoinAccepted}-${data.workspaceId}-${sendPayload.userId}`,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendWorkspaceJoinRejected(
        sendPayload: INotificationEmailSendPayload,
        data: INotificationWorkspaceJoinRejectedPayload
    ): Promise<void> {
        const payload: INotificationEmailQueuePayload<INotificationWorkspaceJoinRejectedPayload> =
            {
                send: sendPayload,
                data,
            };

        await this.emailQueue.add(
            EnumNotificationProcess.workspaceJoinRejected,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.workspaceJoinRejected}-${data.workspaceId}-${sendPayload.userId}`,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }
}
