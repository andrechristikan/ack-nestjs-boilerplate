import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    NotificationPayloadEncryptionPurpose,
    NotificationReferenceJobIdPattern,
    NotificationStepJobIdPattern,
    NotificationTermPolicyBatchJobIdPattern,
    NotificationUserJobIdPattern,
    NotificationWorkspaceUserJobIdPattern,
} from '@modules/notification/constants/notification.constant';
import {
    EnumNotificationProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
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
    private readonly batchDelayInMs: number;
    private readonly verificationExpiredInMs: number;
    private readonly verificationResendInMs: number;
    private readonly forgotPasswordResendInMs: number;
    private readonly encryptionSecretKey: string;

    constructor(
        @InjectQueue(EnumQueue.notificationEmail)
        private readonly emailQueue: Queue,
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperStringService: HelperStringService
    ) {
        this.dedupTtlInMs = this.configService.get<number>(
            'notification.dedupTtlInMs'
        )!;
        this.batchDelayInMs = this.configService.get<number>(
            'email.batchDelayInMs'
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
            cc,
            bcc,
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
                    cc,
                    bcc,
                },
                data: {
                    passwordCreatedAt,
                    passwordExpiredAt,
                    encryptedPassword,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.welcomeByAdmin, userId: userId }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.welcomeByAdmin,
            payload,
            {
                jobId,

                deduplication: {
                    id: deduplicationId,
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
            cc,
            bcc,
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
                    cc,
                    bcc,
                },
                data: {
                    encryptedPassword,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            {
                process: EnumNotificationProcess.temporaryPasswordByAdmin,
                userId,
            }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.temporaryPasswordByAdmin,
            payload,
            {
                jobId,
                deduplication: {
                    id: deduplicationId,
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
        cc,
        bcc,
    }: INotificationEmailSendPayload): Promise<void> {
        const payload: INotificationEmailQueuePayload = {
            send: {
                userId,
                email,
                username,
                notificationId,
                cc,
                bcc,
            },
            data: null,
        };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.resetPassword, userId: userId }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.resetPassword,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.low,
                deduplication: {
                    id: deduplicationId,
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
        cc,
        bcc,
    }: INotificationEmailSendPayload): Promise<void> {
        const payload: INotificationEmailQueuePayload = {
            send: {
                userId,
                email,
                username,
                notificationId,
                cc,
                bcc,
            },
            data: null,
        };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.changePassword, userId: userId }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.changePassword,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.low,
                deduplication: {
                    id: deduplicationId,
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
            cc,
            bcc,
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
                    cc,
                    bcc,
                },
                data: {
                    expiredAt,
                    expiredInMinutes,
                    encryptedLink,
                    reference,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            {
                process: EnumNotificationProcess.verificationEmail,
                userId,
            }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendVerificationEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.verificationEmail,
            payload,
            {
                jobId,
                deduplication: {
                    id: deduplicationId,
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
        cc,
        bcc,
    }: INotificationEmailSendPayload): Promise<void> {
        const payload: INotificationEmailQueuePayload = {
            send: {
                userId,
                email,
                username,
                notificationId,
                cc,
                bcc,
            },
            data: null,
        };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.welcome, userId: userId }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendWelcomeEmail,
            }
        );

        await this.emailQueue.add(EnumNotificationProcess.welcome, payload, {
            jobId,

            deduplication: {
                id: deduplicationId,
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
        cc,
        bcc,
    }: INotificationEmailSendPayload): Promise<void> {
        const payload: INotificationEmailQueuePayload = {
            send: {
                userId,
                email,
                username,
                notificationId,
                cc,
                bcc,
            },
            data: null,
        };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.welcomeSocial, userId: userId }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.welcomeSocial,
            payload,
            {
                jobId,

                deduplication: {
                    id: deduplicationId,
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
            cc,
            bcc,
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
                    cc,
                    bcc,
                },
                data: {
                    reference,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.verifiedEmail, userId: userId }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.verifiedEmail,
            payload,
            {
                jobId,

                deduplication: {
                    id: deduplicationId,
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
            cc,
            bcc,
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
                    cc,
                    bcc,
                },
                data: {
                    expiredAt,
                    expiredInMinutes,
                    encryptedLink,
                    reference,
                    resendInMinutes,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.forgotPassword, userId: userId }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.forgotPassword,
            payload,
            {
                jobId,
                deduplication: {
                    id: deduplicationId,
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
            cc,
            bcc,
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
                    cc,
                    bcc,
                },
                data: {
                    mobileNumber,
                    reference,
                    resendInMinutes,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            {
                process: EnumNotificationProcess.verifiedMobileNumber,
                userId,
            }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.verifiedMobileNumber,
            payload,
            {
                jobId,

                deduplication: {
                    id: deduplicationId,
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
        cc,
        bcc,
    }: INotificationEmailSendPayload): Promise<void> {
        const payload: INotificationEmailQueuePayload = {
            send: {
                userId,
                email,
                username,
                notificationId,
                cc,
                bcc,
            },
            data: null,
        };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            {
                process: EnumNotificationProcess.resetTwoFactorByAdmin,
                userId,
            }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.resetTwoFactorByAdmin,
            payload,
            {
                jobId,
                deduplication: {
                    id: deduplicationId,
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
            cc,
            bcc,
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
                    cc,
                    bcc,
                },
                data: {
                    loginFrom,
                    loginWith,
                    loginAt,
                    requestLog,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.newDeviceLogin, userId: userId }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.newDeviceLogin,
            payload,
            {
                jobId,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendPublishTermPolicyBatch(
        data: INotificationPublishTermPolicyPayload,
        batchId: string,
        proceedBy: string,
        index: number
    ): Promise<void> {
        const payload: INotificationEmailBulkQueuePayload<INotificationPublishTermPolicyPayload> =
            { data, batchId, proceedBy };

        const jobId = this.helperStringService.fillPattern(
            NotificationTermPolicyBatchJobIdPattern,
            {
                process: EnumNotificationProcess.publishTermPolicy,
                termPolicyId: data.termPolicyId,
                batchId,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.publishTermPolicy,
            payload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
                delay: index * this.batchDelayInMs,
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

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationReferenceJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceInvite,
                reference: data.reference,
            }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.workspaceInvite,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: deduplicationId,
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
                send: { email, cc: [], bcc: [] },
                data: {
                    ...invite,
                    encryptedInviteAcceptLink,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationReferenceJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceInviteUnregistered,
                reference: invite.reference,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.workspaceInviteUnregistered,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: deduplicationId,
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

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationWorkspaceUserJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceJoinRequest,
                workspaceId: data.workspaceId,
                userId: sendPayload.userId,
            }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.workspaceJoinRequest,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
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

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationWorkspaceUserJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceJoinAccepted,
                workspaceId: data.workspaceId,
                userId: sendPayload.userId,
            }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.workspaceJoinAccepted,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
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

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationWorkspaceUserJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceJoinRejected,
                workspaceId: data.workspaceId,
                userId: sendPayload.userId,
            }
        );

        const jobId = this.helperStringService.fillPattern(
            NotificationStepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.emailQueue.add(
            EnumNotificationProcess.workspaceJoinRejected,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }
}
