import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationBulkQueuePayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyInput,
    INotificationPublishTermPolicyPayload,
    INotificationQueueJob,
    INotificationQueuePayload,
    INotificationRecipient,
    INotificationRecipientEncryptedPayload,
    INotificationTemporaryPasswordEncryptedPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminEncryptedPayload,
    INotificationWelcomeByAdminItem,
    INotificationWelcomeByAdminPayload,
    INotificationWelcomeEncryptedPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceInvitePayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
    INotificationWorkspaceJoinRequestPayload,
} from '@modules/notification/interfaces/notification.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@queues/bases/queue.base';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';
import { MessageService } from '@common/message/services/message.service';

/**
 * Enqueues jobs onto the main notification queue, each under a fixed job id.
 */
@Injectable()
export class NotificationQueue extends QueueBase {
    private readonly encryptionSecretKey: string;
    private readonly userJobIdPattern: string;
    private readonly referenceJobIdPattern: string;
    private readonly eventJobIdPattern: string;
    private readonly joinRequestJobIdPattern: string;
    private readonly termPolicyPublishJobIdPattern: string;
    private readonly termPolicyResendJobIdPattern: string;
    private readonly userTermPolicyJobIdPattern: string;

    constructor(
        @InjectQueue(EnumQueue.notification) protected readonly queue: Queue,
        protected readonly sentryService: SentryService,
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperStringService: HelperStringService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly messageService: MessageService
    ) {
        super(queue, sentryService);
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;
        this.userJobIdPattern = this.configService.get<string>(
            'notification.jobId.userPattern'
        )!;
        this.referenceJobIdPattern = this.configService.get<string>(
            'notification.jobId.referencePattern'
        )!;
        this.eventJobIdPattern = this.configService.get<string>(
            'notification.jobId.eventPattern'
        )!;
        this.joinRequestJobIdPattern = this.configService.get<string>(
            'notification.jobId.joinRequestPattern'
        )!;
        this.termPolicyPublishJobIdPattern = this.configService.get<string>(
            'notification.jobId.termPolicyPublishPattern'
        )!;
        this.termPolicyResendJobIdPattern = this.configService.get<string>(
            'notification.jobId.termPolicyResendPattern'
        )!;
        this.userTermPolicyJobIdPattern = this.configService.get<string>(
            'notification.jobId.userTermPolicyPattern'
        )!;
    }

    private encryptValue(plaintext: string, recipientId: string): string {
        return this.helperEncryptionService.aes256Encrypt(
            plaintext,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            recipientId
        );
    }

    private encryptRecipient({
        userId,
        email,
        username,
        notificationTokens,
        channels,
    }: INotificationRecipient): INotificationRecipientEncryptedPayload {
        const encryptedEmail = this.encryptValue(email, userId);
        const encryptedNotificationTokens = notificationTokens.map(token =>
            this.encryptValue(token, userId)
        );

        return {
            encryptedEmail,
            username,
            encryptedNotificationTokens,
            channels,
        };
    }

    private buildWelcomeByAdminJob(
        recipient: INotificationRecipient,
        {
            password,
            passwordCreatedAt,
            passwordExpiredAt,
        }: INotificationWelcomeByAdminPayload,
        createdBy: string
    ): INotificationQueueJob<INotificationWelcomeByAdminEncryptedPayload> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const encryptedPassword = this.encryptValue(password, userId);
        const notificationId = this.databaseUtil.createId();
        const data: INotificationQueuePayload<INotificationWelcomeByAdminEncryptedPayload> =
            {
                userId,
                notificationId,
                completedSteps: [],
                recipient: encryptedRecipient,
                proceedBy: createdBy,
                data: {
                    encryptedPassword,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
            };

        const jobId = this.helperStringService.fillPattern(
            this.userJobIdPattern,
            { process: EnumNotificationProcess.welcomeByAdmin, userId }
        );

        return {
            name: EnumNotificationProcess.welcomeByAdmin,
            data,
            opts: { priority: EnumQueuePriority.medium, jobId },
        };
    }

    private buildWorkspaceJoinRequestJob(
        recipient: INotificationRecipient,
        {
            joinRequestReviewLink,
            ...joinRequest
        }: INotificationWorkspaceJoinRequestPayload,
        requestedByUserId: string
    ): INotificationQueueJob<INotificationWorkspaceJoinRequestEncryptedPayload> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const encryptedJoinRequestReviewLink = this.encryptValue(
            joinRequestReviewLink,
            userId
        );
        const notificationId = this.databaseUtil.createId();
        const data: INotificationQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload> =
            {
                userId,
                notificationId,
                completedSteps: [],
                recipient: encryptedRecipient,
                proceedBy: requestedByUserId,
                data: {
                    ...joinRequest,
                    encryptedJoinRequestReviewLink,
                },
            };

        const jobId = this.helperStringService.fillPattern(
            this.joinRequestJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceJoinRequest,
                joinRequestId: joinRequest.joinRequestId,
                userId,
            }
        );

        return {
            name: EnumNotificationProcess.workspaceJoinRequest,
            data,
            opts: { priority: EnumQueuePriority.medium, jobId },
        };
    }

    async sendWelcomeByAdmin(
        recipient: INotificationRecipient,
        payload: INotificationWelcomeByAdminPayload,
        createdBy: string
    ): Promise<void> {
        const { name, data, opts } = this.buildWelcomeByAdminJob(
            recipient,
            payload,
            createdBy
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueWelcomeByAdmin'
        );

        await this.addSideEffect(name, data, opts, description);
    }

    /** Queues one welcomeByAdmin job per user in a single `addBulk`. */
    async sendWelcomeByAdminBulk(
        items: INotificationWelcomeByAdminItem[],
        createdBy: string
    ): Promise<void> {
        const jobs = items.map(({ recipient, data }) =>
            this.buildWelcomeByAdminJob(recipient, data, createdBy)
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueWelcomeByAdminBulk'
        );

        await this.addBulkSideEffect(jobs, description);
    }

    async sendWelcome(
        recipient: INotificationRecipient,
        {
            link,
            expiredAt,
            expiredInMinutes,
            reference,
        }: INotificationVerificationEmailPayload
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const encryptedLink = this.encryptValue(link, userId);
        const notificationId = this.databaseUtil.createId();
        const verificationNotificationId = this.databaseUtil.createId();
        const payload: INotificationQueuePayload<INotificationWelcomeEncryptedPayload> =
            {
                userId,
                notificationId,
                completedSteps: [],
                recipient: encryptedRecipient,
                proceedBy: userId,
                data: {
                    encryptedLink,
                    expiredAt,
                    expiredInMinutes,
                    reference,
                    verificationNotificationId,
                },
            };

        const jobId = this.helperStringService.fillPattern(
            this.userJobIdPattern,
            { process: EnumNotificationProcess.welcome, userId: userId }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueWelcome'
        );

        await this.addSideEffect(
            EnumNotificationProcess.welcome,
            payload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
            },
            description
        );
    }

    async sendWelcomeSocial(recipient: INotificationRecipient): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const notificationId = this.databaseUtil.createId();
        const payload: INotificationQueuePayload = {
            userId,
            notificationId,
            completedSteps: [],
            recipient: encryptedRecipient,
            proceedBy: userId,
            data: null,
        };

        const jobId = this.helperStringService.fillPattern(
            this.userJobIdPattern,
            { process: EnumNotificationProcess.welcomeSocial, userId: userId }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueWelcomeSocial'
        );

        await this.addSideEffect(
            EnumNotificationProcess.welcomeSocial,
            payload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
            },
            description
        );
    }

    async sendTemporaryPasswordByAdmin(
        recipient: INotificationRecipient,
        {
            password,
            passwordCreatedAt,
            passwordExpiredAt,
        }: INotificationTemporaryPasswordPayload,
        createdBy: string,
        passwordHistoryId: string
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const encryptedPassword = this.encryptValue(password, userId);
        const notificationId = this.databaseUtil.createId();
        const payload: INotificationQueuePayload<INotificationTemporaryPasswordEncryptedPayload> =
            {
                userId,
                notificationId,
                completedSteps: [],
                recipient: encryptedRecipient,
                proceedBy: createdBy,
                data: {
                    encryptedPassword,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
            };

        const jobId = this.helperStringService.fillPattern(
            this.eventJobIdPattern,
            {
                process: EnumNotificationProcess.temporaryPasswordByAdmin,
                eventId: passwordHistoryId,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueTemporaryPasswordByAdmin'
        );

        await this.addSideEffect(
            EnumNotificationProcess.temporaryPasswordByAdmin,
            payload,
            {
                priority: EnumQueuePriority.high,
                jobId,
            },
            description
        );
    }

    async sendChangePassword(
        recipient: INotificationRecipient,
        passwordHistoryId: string
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const notificationId = this.databaseUtil.createId();
        const payload: INotificationQueuePayload = {
            userId,
            notificationId,
            completedSteps: [],
            recipient: encryptedRecipient,
            proceedBy: userId,
            data: null,
        };

        const jobId = this.helperStringService.fillPattern(
            this.eventJobIdPattern,
            {
                process: EnumNotificationProcess.changePassword,
                eventId: passwordHistoryId,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueChangePassword'
        );

        await this.addSideEffect(
            EnumNotificationProcess.changePassword,
            payload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
            },
            description
        );
    }

    async sendVerifiedEmail(
        recipient: INotificationRecipient,
        verified: INotificationVerifiedEmailPayload
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const notificationId = this.databaseUtil.createId();
        const payload: INotificationQueuePayload<INotificationVerifiedEmailPayload> =
            {
                userId,
                notificationId,
                completedSteps: [],
                recipient: encryptedRecipient,
                data: verified,
                proceedBy: userId,
            };

        const jobId = this.helperStringService.fillPattern(
            this.referenceJobIdPattern,
            {
                process: EnumNotificationProcess.verifiedEmail,
                reference: verified.reference,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueVerifiedEmail'
        );

        await this.addSideEffect(
            EnumNotificationProcess.verifiedEmail,
            payload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
            },
            description
        );
    }

    async sendVerificationEmail(
        recipient: INotificationRecipient,
        {
            expiredAt,
            expiredInMinutes,
            link,
            reference,
        }: INotificationVerificationEmailPayload
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const encryptedLink = this.encryptValue(link, userId);
        const notificationId = this.databaseUtil.createId();
        const payload: INotificationQueuePayload<INotificationVerificationEmailEncryptedPayload> =
            {
                userId,
                notificationId,
                completedSteps: [],
                recipient: encryptedRecipient,
                proceedBy: userId,
                data: {
                    encryptedLink,
                    expiredAt,
                    expiredInMinutes,
                    reference,
                },
            };

        const jobId = this.helperStringService.fillPattern(
            this.referenceJobIdPattern,
            {
                process: EnumNotificationProcess.verificationEmail,
                reference,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueVerificationEmail'
        );

        await this.addSideEffect(
            EnumNotificationProcess.verificationEmail,
            payload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
            },
            description
        );
    }

    async sendForgotPassword(
        recipient: INotificationRecipient,
        {
            link,
            expiredAt,
            expiredInMinutes,
            reference,
            resendInMinutes,
        }: INotificationForgotPasswordPayload
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const encryptedLink = this.encryptValue(link, userId);
        const notificationId = this.databaseUtil.createId();
        const payload: INotificationQueuePayload<INotificationForgotPasswordEncryptedPayload> =
            {
                userId,
                notificationId,
                completedSteps: [],
                recipient: encryptedRecipient,
                proceedBy: userId,
                data: {
                    encryptedLink,
                    expiredAt,
                    expiredInMinutes,
                    reference,
                    resendInMinutes,
                },
            };

        const jobId = this.helperStringService.fillPattern(
            this.referenceJobIdPattern,
            {
                process: EnumNotificationProcess.forgotPassword,
                reference,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueForgotPassword'
        );

        await this.addSideEffect(
            EnumNotificationProcess.forgotPassword,
            payload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
            },
            description
        );
    }

    async sendResetPassword(
        recipient: INotificationRecipient,
        resetPasswordId: string
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const notificationId = this.databaseUtil.createId();
        const payload: INotificationQueuePayload = {
            userId,
            notificationId,
            completedSteps: [],
            recipient: encryptedRecipient,
            proceedBy: userId,
            data: null,
        };

        const jobId = this.helperStringService.fillPattern(
            this.eventJobIdPattern,
            {
                process: EnumNotificationProcess.resetPassword,
                eventId: resetPasswordId,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueResetPassword'
        );

        await this.addSideEffect(
            EnumNotificationProcess.resetPassword,
            payload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
            },
            description
        );
    }

    async sendResetTwoFactorByAdmin(
        recipient: INotificationRecipient,
        createdBy: string
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const notificationId = this.databaseUtil.createId();
        const payload: INotificationQueuePayload = {
            userId,
            notificationId,
            completedSteps: [],
            recipient: encryptedRecipient,
            proceedBy: createdBy,
            data: null,
        };

        const jobId = this.helperStringService.fillPattern(
            this.eventJobIdPattern,
            {
                process: EnumNotificationProcess.resetTwoFactorByAdmin,
                eventId: notificationId,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueResetTwoFactorByAdmin'
        );

        await this.addSideEffect(
            EnumNotificationProcess.resetTwoFactorByAdmin,
            payload,
            {
                priority: EnumQueuePriority.high,
                jobId,
            },
            description
        );
    }

    async sendNewDeviceLogin(
        recipient: INotificationRecipient,
        newDevice: INotificationNewDeviceLoginPayload,
        sessionId: string
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const notificationId = this.databaseUtil.createId();
        const payload: INotificationQueuePayload<INotificationNewDeviceLoginPayload> =
            {
                userId,
                notificationId,
                completedSteps: [],
                recipient: encryptedRecipient,
                data: newDevice,
                proceedBy: userId,
            };

        const jobId = this.helperStringService.fillPattern(
            this.eventJobIdPattern,
            {
                process: EnumNotificationProcess.newDeviceLogin,
                eventId: sessionId,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueNewDeviceLogin'
        );

        await this.addSideEffect(
            EnumNotificationProcess.newDeviceLogin,
            payload,
            {
                priority: EnumQueuePriority.high,
                jobId,
            },
            description
        );
    }

    async sendPublishTermPolicy(
        payload: INotificationPublishTermPolicyPayload,
        publishedBy: string
    ): Promise<void> {
        const queuePayload: INotificationBulkQueuePayload<INotificationPublishTermPolicyPayload> =
            {
                proceedBy: publishedBy,
                data: payload,
            };

        const jobId = this.helperStringService.fillPattern(
            this.termPolicyPublishJobIdPattern,
            {
                process: EnumNotificationProcess.publishTermPolicy,
                termPolicyId: payload.termPolicyId,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueuePublishTermPolicy'
        );

        await this.addSideEffect(
            EnumNotificationProcess.publishTermPolicy,
            queuePayload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
            },
            description
        );
    }

    async sendResendPublishTermPolicy(
        payload: INotificationPublishTermPolicyInput,
        proceedBy: string
    ): Promise<void> {
        const resendNonce = this.databaseUtil.createId();
        const queuePayload: INotificationBulkQueuePayload<INotificationPublishTermPolicyPayload> =
            { proceedBy, data: { ...payload, resendNonce } };

        const jobId = this.helperStringService.fillPattern(
            this.termPolicyResendJobIdPattern,
            {
                process: EnumNotificationProcess.resendPublishTermPolicy,
                termPolicyId: payload.termPolicyId,
                resendNonce,
            }
        );

        await this.queue.add(
            EnumNotificationProcess.resendPublishTermPolicy,
            queuePayload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
            }
        );
    }

    async sendVerifiedMobileNumber(
        recipient: INotificationRecipient,
        verifiedMobile: INotificationVerifiedMobileNumberPayload
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const notificationId = this.databaseUtil.createId();
        const payload: INotificationQueuePayload<INotificationVerifiedMobileNumberPayload> =
            {
                userId,
                notificationId,
                completedSteps: [],
                recipient: encryptedRecipient,
                data: verifiedMobile,
                proceedBy: userId,
            };

        const jobId = this.helperStringService.fillPattern(
            this.referenceJobIdPattern,
            {
                process: EnumNotificationProcess.verifiedMobileNumber,
                reference: verifiedMobile.reference,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueVerifiedMobileNumber'
        );

        await this.addSideEffect(
            EnumNotificationProcess.verifiedMobileNumber,
            payload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
            },
            description
        );
    }

    async sendUserAcceptTermPolicy(
        recipient: INotificationRecipient,
        payload: INotificationAcceptTermPolicyPayload
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const notificationId = this.databaseUtil.createId();
        const queuePayload: INotificationQueuePayload<INotificationAcceptTermPolicyPayload> =
            {
                userId,
                notificationId,
                completedSteps: [],
                recipient: encryptedRecipient,
                data: payload,
                proceedBy: userId,
            };

        const jobId = this.helperStringService.fillPattern(
            this.userTermPolicyJobIdPattern,
            {
                process: EnumNotificationProcess.userAcceptTermPolicy,
                userId,
                termPolicyId: payload.termPolicyId,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueUserAcceptTermPolicy'
        );

        await this.addSideEffect(
            EnumNotificationProcess.userAcceptTermPolicy,
            queuePayload,
            {
                priority: EnumQueuePriority.low,
                jobId,
            },
            description
        );
    }

    /** Queues the workspace invite notification for a registered invitee (has `userId`); creates a `Notification` row plus email and push. */
    async sendWorkspaceInvite(
        recipient: INotificationRecipient,
        { inviteAcceptLink, ...invite }: INotificationWorkspaceInvitePayload,
        invitedByUserId: string
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const encryptedInviteAcceptLink = this.encryptValue(
            inviteAcceptLink,
            userId
        );
        const notificationId = this.databaseUtil.createId();
        const payload: INotificationQueuePayload<INotificationWorkspaceInviteEncryptedPayload> =
            {
                userId,
                notificationId,
                completedSteps: [],
                recipient: encryptedRecipient,
                proceedBy: invitedByUserId,
                data: {
                    ...invite,
                    encryptedInviteAcceptLink,
                },
            };

        const jobId = this.helperStringService.fillPattern(
            this.referenceJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceInvite,
                reference: invite.reference,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueWorkspaceInvite'
        );

        await this.addSideEffect(
            EnumNotificationProcess.workspaceInvite,
            payload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
            },
            description
        );
    }

    /** Queues the workspace join-request notification for every reviewer (workspace owner/admin) in a single `addBulk`. */
    async sendWorkspaceJoinRequestBulk(
        recipients: INotificationRecipient[],
        payload: INotificationWorkspaceJoinRequestPayload,
        requestedByUserId: string
    ): Promise<void> {
        const jobs = recipients.map(recipient =>
            this.buildWorkspaceJoinRequestJob(
                recipient,
                payload,
                requestedByUserId
            )
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueWorkspaceJoinRequestBulk'
        );

        await this.addBulkSideEffect(jobs, description);
    }

    async sendWorkspaceJoinAccepted(
        recipient: INotificationRecipient,
        payload: INotificationWorkspaceJoinAcceptedPayload,
        reviewedByUserId: string,
        joinRequestId: string
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const notificationId = this.databaseUtil.createId();
        const queuePayload: INotificationQueuePayload<INotificationWorkspaceJoinAcceptedPayload> =
            {
                userId,
                notificationId,
                completedSteps: [],
                recipient: encryptedRecipient,
                data: payload,
                proceedBy: reviewedByUserId,
            };

        const jobId = this.helperStringService.fillPattern(
            this.joinRequestJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceJoinAccepted,
                joinRequestId,
                userId,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueWorkspaceJoinAccepted'
        );

        await this.addSideEffect(
            EnumNotificationProcess.workspaceJoinAccepted,
            queuePayload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
            },
            description
        );
    }

    async sendWorkspaceJoinRejected(
        recipient: INotificationRecipient,
        payload: INotificationWorkspaceJoinRejectedPayload,
        reviewedByUserId: string,
        joinRequestId: string
    ): Promise<void> {
        const { userId } = recipient;
        const encryptedRecipient = this.encryptRecipient(recipient);
        const notificationId = this.databaseUtil.createId();
        const queuePayload: INotificationQueuePayload<INotificationWorkspaceJoinRejectedPayload> =
            {
                userId,
                notificationId,
                completedSteps: [],
                recipient: encryptedRecipient,
                data: payload,
                proceedBy: reviewedByUserId,
            };

        const jobId = this.helperStringService.fillPattern(
            this.joinRequestJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceJoinRejected,
                joinRequestId,
                userId,
            }
        );

        const description = this.messageService.setMessage(
            'notification.queue.error.enqueueWorkspaceJoinRejected'
        );

        await this.addSideEffect(
            EnumNotificationProcess.workspaceJoinRejected,
            queuePayload,
            {
                priority: EnumQueuePriority.medium,
                jobId,
            },
            description
        );
    }
}
