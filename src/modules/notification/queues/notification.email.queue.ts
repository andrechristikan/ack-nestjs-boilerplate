import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import {
    EnumNotificationProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailBulkQueuePayload,
    INotificationEmailQueuePayload,
    INotificationEmailSendEncryptedPayload,
    INotificationEmailUnregisteredQueuePayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordEncryptedPayload,
    INotificationTermPolicyBatchRecipient,
    INotificationTermPolicyBatchRecipientEncryptedPayload,
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
import { QueueBase } from '@queues/bases/queue.base';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';
import { MessageService } from '@common/message/services/message.service';

/**
 * Enqueues email notification jobs onto the email queue, each under a fixed job id.
 */
@Injectable()
export class NotificationEmailQueue extends QueueBase {
    private readonly batchDelayInMs: number;
    private readonly encryptionSecretKey: string;
    private readonly referenceJobIdPattern: string;
    private readonly stepJobIdPattern: string;
    private readonly termPolicyBatchJobIdPattern: string;
    private readonly termPolicyBatchResendJobIdPattern: string;

    constructor(
        @InjectQueue(EnumQueue.notificationEmail)
        protected readonly queue: Queue,
        protected readonly sentryService: SentryService,
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperStringService: HelperStringService,
        private readonly messageService: MessageService
    ) {
        super(queue, sentryService);
        this.batchDelayInMs = this.configService.get<number>(
            'email.batchDelayInMs'
        )!;
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;
        this.referenceJobIdPattern = this.configService.get<string>(
            'notification.jobId.referencePattern'
        )!;
        this.stepJobIdPattern = this.configService.get<string>(
            'notification.jobId.stepPattern'
        )!;
        this.termPolicyBatchJobIdPattern = this.configService.get<string>(
            'notification.jobId.termPolicyBatchPattern'
        )!;
        this.termPolicyBatchResendJobIdPattern = this.configService.get<string>(
            'notification.jobId.termPolicyBatchResendPattern'
        )!;
    }

    private encryptBatchRecipient({
        userId,
        notificationId,
        email,
        username,
    }: INotificationTermPolicyBatchRecipient): INotificationTermPolicyBatchRecipientEncryptedPayload {
        const encryptedEmail = this.helperEncryptionService.aes256Encrypt(
            email,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            userId
        );

        return { userId, notificationId, encryptedEmail, username };
    }

    async sendWelcomeByAdmin(
        {
            encryptedEmail,
            username,
            userId,
            notificationId,
            cc,
            bcc,
        }: INotificationEmailSendEncryptedPayload,
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
                    encryptedEmail,
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

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(EnumNotificationProcess.welcomeByAdmin, payload, {
            jobId,

            priority: EnumQueuePriority.medium,
        });
    }

    async sendTemporaryPasswordByAdmin(
        {
            encryptedEmail,
            username,
            userId,
            notificationId,
            cc,
            bcc,
        }: INotificationEmailSendEncryptedPayload,
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
                    encryptedEmail,
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

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(
            EnumNotificationProcess.temporaryPasswordByAdmin,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.medium,
            }
        );
    }

    async sendResetPassword({
        encryptedEmail,
        username,
        userId,
        notificationId,
        cc,
        bcc,
    }: INotificationEmailSendEncryptedPayload): Promise<void> {
        const payload: INotificationEmailQueuePayload = {
            send: {
                userId,
                encryptedEmail,
                username,
                notificationId,
                cc,
                bcc,
            },
            data: null,
        };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(EnumNotificationProcess.resetPassword, payload, {
            jobId,
            priority: EnumQueuePriority.low,
        });
    }

    async sendChangePassword({
        encryptedEmail,
        username,
        userId,
        notificationId,
        cc,
        bcc,
    }: INotificationEmailSendEncryptedPayload): Promise<void> {
        const payload: INotificationEmailQueuePayload = {
            send: {
                userId,
                encryptedEmail,
                username,
                notificationId,
                cc,
                bcc,
            },
            data: null,
        };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(EnumNotificationProcess.changePassword, payload, {
            jobId,
            priority: EnumQueuePriority.low,
        });
    }

    async sendVerificationEmail(
        {
            encryptedEmail,
            username,
            userId,
            notificationId,
            cc,
            bcc,
        }: INotificationEmailSendEncryptedPayload,
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
                    encryptedEmail,
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

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendVerificationEmail,
            }
        );

        await this.queue.add(
            EnumNotificationProcess.verificationEmail,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendWelcome({
        encryptedEmail,
        username,
        userId,
        notificationId,
        cc,
        bcc,
    }: INotificationEmailSendEncryptedPayload): Promise<void> {
        const payload: INotificationEmailQueuePayload = {
            send: {
                userId,
                encryptedEmail,
                username,
                notificationId,
                cc,
                bcc,
            },
            data: null,
        };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendWelcomeEmail,
            }
        );

        await this.queue.add(EnumNotificationProcess.welcome, payload, {
            jobId,

            priority: EnumQueuePriority.low,
        });
    }

    async sendWelcomeSocial({
        encryptedEmail,
        username,
        userId,
        notificationId,
        cc,
        bcc,
    }: INotificationEmailSendEncryptedPayload): Promise<void> {
        const payload: INotificationEmailQueuePayload = {
            send: {
                userId,
                encryptedEmail,
                username,
                notificationId,
                cc,
                bcc,
            },
            data: null,
        };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(EnumNotificationProcess.welcomeSocial, payload, {
            jobId,

            priority: EnumQueuePriority.low,
        });
    }

    async sendVerifiedEmail(
        {
            encryptedEmail,
            username,
            userId,
            notificationId,
            cc,
            bcc,
        }: INotificationEmailSendEncryptedPayload,
        { reference }: INotificationVerifiedEmailPayload
    ): Promise<void> {
        const payload: INotificationEmailQueuePayload<INotificationVerifiedEmailPayload> =
            {
                send: {
                    userId,
                    encryptedEmail,
                    username,
                    notificationId,
                    cc,
                    bcc,
                },
                data: {
                    reference,
                },
            };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(EnumNotificationProcess.verifiedEmail, payload, {
            jobId,

            priority: EnumQueuePriority.low,
        });
    }

    async sendForgotPassword(
        {
            encryptedEmail,
            username,
            userId,
            notificationId,
            cc,
            bcc,
        }: INotificationEmailSendEncryptedPayload,
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
                    encryptedEmail,
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

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(EnumNotificationProcess.forgotPassword, payload, {
            jobId,
            priority: EnumQueuePriority.high,
        });
    }

    async sendVerifiedMobileNumber(
        {
            encryptedEmail,
            username,
            userId,
            notificationId,
            cc,
            bcc,
        }: INotificationEmailSendEncryptedPayload,
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
                    encryptedEmail,
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

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(
            EnumNotificationProcess.verifiedMobileNumber,
            payload,
            {
                jobId,

                priority: EnumQueuePriority.low,
            }
        );
    }

    async sendResetTwoFactorByAdmin({
        encryptedEmail,
        username,
        userId,
        notificationId,
        cc,
        bcc,
    }: INotificationEmailSendEncryptedPayload): Promise<void> {
        const payload: INotificationEmailQueuePayload = {
            send: {
                userId,
                encryptedEmail,
                username,
                notificationId,
                cc,
                bcc,
            },
            data: null,
        };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(
            EnumNotificationProcess.resetTwoFactorByAdmin,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendNewDeviceLogin(
        {
            encryptedEmail,
            username,
            userId,
            notificationId,
            cc,
            bcc,
        }: INotificationEmailSendEncryptedPayload,
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
                    encryptedEmail,
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

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(EnumNotificationProcess.newDeviceLogin, payload, {
            jobId,
            priority: EnumQueuePriority.high,
        });
    }

    async sendPublishTermPolicyBatch(
        data: INotificationPublishTermPolicyPayload,
        batchId: string,
        proceedBy: string,
        index: number,
        recipients: INotificationTermPolicyBatchRecipient[]
    ): Promise<void> {
        const encryptedRecipients = recipients.map(recipient =>
            this.encryptBatchRecipient(recipient)
        );
        const payload: INotificationEmailBulkQueuePayload<INotificationPublishTermPolicyPayload> =
            { data, batchId, proceedBy, recipients: encryptedRecipients };

        const jobIdPattern =
            data.resendNonce === null
                ? this.termPolicyBatchJobIdPattern
                : this.termPolicyBatchResendJobIdPattern;
        const jobId = this.helperStringService.fillPattern(jobIdPattern, {
            process: EnumNotificationProcess.publishTermPolicy,
            termPolicyId: data.termPolicyId,
            batchId,
            ...(data.resendNonce !== null && {
                resendNonce: data.resendNonce,
            }),
        });

        await this.queue.add(
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
        sendPayload: INotificationEmailSendEncryptedPayload,
        data: INotificationWorkspaceInviteEncryptedPayload
    ): Promise<void> {
        const payload: INotificationEmailQueuePayload<INotificationWorkspaceInviteEncryptedPayload> =
            {
                send: sendPayload,
                data,
            };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(EnumNotificationProcess.workspaceInvite, payload, {
            jobId,
            priority: EnumQueuePriority.high,
        });
    }

    /** Enqueues the workspace invite email directly for an unregistered invitee (no `userId`, no `Notification` row); the address and the link are sealed to the invite reference. */
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
        const encryptedEmail = this.helperEncryptionService.aes256Encrypt(
            email,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            invite.reference
        );
        const payload: INotificationEmailUnregisteredQueuePayload<INotificationWorkspaceInviteUnregisteredEncryptedPayload> =
            {
                send: { encryptedEmail, cc: [], bcc: [] },
                data: {
                    ...invite,
                    encryptedInviteAcceptLink,
                },
            };

        const jobId = this.helperStringService.fillPattern(
            this.referenceJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceInviteUnregistered,
                reference: invite.reference,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.email.error.enqueueWorkspaceInviteUnregistered'
        );

        await this.addSideEffect(
            EnumNotificationProcess.workspaceInviteUnregistered,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.high,
            },
            description
        );
    }

    async sendWorkspaceJoinRequest(
        sendPayload: INotificationEmailSendEncryptedPayload,
        data: INotificationWorkspaceJoinRequestEncryptedPayload
    ): Promise<void> {
        const payload: INotificationEmailQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload> =
            {
                send: sendPayload,
                data,
            };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(
            EnumNotificationProcess.workspaceJoinRequest,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.medium,
            }
        );
    }

    async sendWorkspaceJoinAccepted(
        sendPayload: INotificationEmailSendEncryptedPayload,
        data: INotificationWorkspaceJoinAcceptedPayload
    ): Promise<void> {
        const payload: INotificationEmailQueuePayload<INotificationWorkspaceJoinAcceptedPayload> =
            {
                send: sendPayload,
                data,
            };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(
            EnumNotificationProcess.workspaceJoinAccepted,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.medium,
            }
        );
    }

    async sendWorkspaceJoinRejected(
        sendPayload: INotificationEmailSendEncryptedPayload,
        data: INotificationWorkspaceJoinRejectedPayload
    ): Promise<void> {
        const payload: INotificationEmailQueuePayload<INotificationWorkspaceJoinRejectedPayload> =
            {
                send: sendPayload,
                data,
            };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendEmail,
            }
        );

        await this.queue.add(
            EnumNotificationProcess.workspaceJoinRejected,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.medium,
            }
        );
    }
}
