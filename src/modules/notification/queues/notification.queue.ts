import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    NotificationPayloadEncryptionPurpose,
    NotificationReferenceJobIdPattern,
    NotificationTermPolicyJobIdPattern,
    NotificationUserJobIdPattern,
    NotificationUserTermPolicyJobIdPattern,
    NotificationWorkspaceUserJobIdPattern,
} from '@modules/notification/constants/notification.constant';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationBulkQueuePayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationQueuePayload,
    INotificationTemporaryPasswordEncryptedPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminEncryptedPayload,
    INotificationWelcomeByAdminPayload,
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
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

/**
 * Enqueues jobs onto the main notification queue.
 */
@Injectable()
export class NotificationQueue {
    private readonly dedupTtlInMs: number;
    private readonly encryptionSecretKey: string;

    constructor(
        @InjectQueue(EnumQueue.notification)
        private readonly notificationQueue: Queue,
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperStringService: HelperStringService
    ) {
        this.dedupTtlInMs = this.configService.get<number>(
            'notification.dedupTtlInMs'
        )!;
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
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

    async sendWelcomeByAdmin(
        userId: string,
        {
            password,
            passwordCreatedAt,
            passwordExpiredAt,
        }: INotificationWelcomeByAdminPayload,
        createdBy: string
    ): Promise<void> {
        const encryptedPassword = this.encryptValue(password, userId);
        const payload: INotificationQueuePayload<INotificationWelcomeByAdminEncryptedPayload> =
            {
                userId,
                proceedBy: createdBy,
                data: {
                    encryptedPassword,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.welcomeByAdmin, userId: userId }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.welcomeByAdmin,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendWelcome(
        userId: string,
        {
            link,
            expiredAt,
            expiredInMinutes,
            reference,
        }: INotificationVerificationEmailPayload
    ): Promise<void> {
        const encryptedLink = this.encryptValue(link, userId);
        const payload: INotificationQueuePayload<INotificationVerificationEmailEncryptedPayload> =
            {
                userId,
                proceedBy: userId,
                data: {
                    encryptedLink,
                    expiredAt,
                    expiredInMinutes,
                    reference,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.welcome, userId: userId }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.welcome,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendWelcomeSocial(userId: string): Promise<void> {
        const payload: INotificationQueuePayload = {
            userId,
            proceedBy: userId,
        };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.welcomeSocial, userId: userId }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.welcomeSocial,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendTemporaryPasswordByAdmin(
        userId: string,
        {
            password,
            passwordCreatedAt,
            passwordExpiredAt,
        }: INotificationTemporaryPasswordPayload,
        createdBy: string
    ): Promise<void> {
        const encryptedPassword = this.encryptValue(password, userId);
        const payload: INotificationQueuePayload<INotificationTemporaryPasswordEncryptedPayload> =
            {
                userId,
                proceedBy: createdBy,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.temporaryPasswordByAdmin,
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

    async sendChangePassword(userId: string): Promise<void> {
        const payload: INotificationQueuePayload = {
            userId,
            proceedBy: userId,
        };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.changePassword, userId: userId }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.changePassword,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendVerifiedEmail(
        userId: string,
        verified: INotificationVerifiedEmailPayload
    ): Promise<void> {
        const payload: INotificationQueuePayload<INotificationVerifiedEmailPayload> =
            {
                userId,
                data: verified,
                proceedBy: userId,
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.verifiedEmail, userId: userId }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.verifiedEmail,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendVerificationEmail(
        userId: string,
        {
            expiredAt,
            expiredInMinutes,
            link,
            reference,
        }: INotificationVerificationEmailPayload
    ): Promise<void> {
        const encryptedLink = this.encryptValue(link, userId);
        const payload: INotificationQueuePayload<INotificationVerificationEmailEncryptedPayload> =
            {
                userId,
                proceedBy: userId,
                data: {
                    encryptedLink,
                    expiredAt,
                    expiredInMinutes,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.verificationEmail,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendForgotPassword(
        userId: string,
        {
            link,
            expiredAt,
            expiredInMinutes,
            reference,
            resendInMinutes,
        }: INotificationForgotPasswordPayload
    ): Promise<void> {
        const encryptedLink = this.encryptValue(link, userId);
        const payload: INotificationQueuePayload<INotificationForgotPasswordEncryptedPayload> =
            {
                userId,
                proceedBy: userId,
                data: {
                    encryptedLink,
                    expiredAt,
                    expiredInMinutes,
                    reference,
                    resendInMinutes,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.forgotPassword, userId: userId }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.forgotPassword,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendResetPassword(userId: string): Promise<void> {
        const payload: INotificationQueuePayload = {
            userId,
            proceedBy: userId,
        };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.resetPassword, userId: userId }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.resetPassword,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendResetTwoFactorByAdmin(
        userId: string,
        createdBy: string
    ): Promise<void> {
        const payload: INotificationQueuePayload = {
            userId,
            proceedBy: createdBy,
        };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            {
                process: EnumNotificationProcess.resetTwoFactorByAdmin,
                userId,
            }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.resetTwoFactorByAdmin,
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

    async sendNewDeviceLogin(
        userId: string,
        newDevice: INotificationNewDeviceLoginPayload
    ): Promise<void> {
        const payload: INotificationQueuePayload<INotificationNewDeviceLoginPayload> =
            {
                userId,
                data: newDevice,
                proceedBy: userId,
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            { process: EnumNotificationProcess.newDeviceLogin, userId: userId }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.newDeviceLogin,
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

    async sendPublishTermPolicy(
        payload: INotificationPublishTermPolicyPayload,
        publishedBy: string
    ): Promise<void> {
        const queuePayload: INotificationBulkQueuePayload<INotificationPublishTermPolicyPayload> =
            {
                proceedBy: publishedBy,
                data: payload,
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationTermPolicyJobIdPattern,
            {
                process: EnumNotificationProcess.publishTermPolicy,
                type: payload.type,
                version: String(payload.version),
            }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.publishTermPolicy,
            queuePayload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendVerifiedMobileNumber(
        userId: string,
        verifiedMobile: INotificationVerifiedMobileNumberPayload
    ): Promise<void> {
        const payload: INotificationQueuePayload<INotificationVerifiedMobileNumberPayload> =
            {
                userId,
                data: verifiedMobile,
                proceedBy: userId,
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            {
                process: EnumNotificationProcess.verifiedMobileNumber,
                userId,
            }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.verifiedMobileNumber,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendUserAcceptTermPolicy(
        userId: string,
        payload: INotificationAcceptTermPolicyPayload
    ): Promise<void> {
        const queuePayload: INotificationQueuePayload<INotificationAcceptTermPolicyPayload> =
            {
                userId,
                data: payload,
                proceedBy: userId,
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserTermPolicyJobIdPattern,
            {
                process: EnumNotificationProcess.userAcceptTermPolicy,
                userId,
                termPolicyId: payload.termPolicyId,
            }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.userAcceptTermPolicy,
            queuePayload,
            {
                priority: EnumQueuePriority.low,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    /** Queues the workspace invite notification for a registered invitee (has `userId`); creates a `Notification` row plus email and push. */
    async sendWorkspaceInvite(
        userId: string,
        { inviteAcceptLink, ...invite }: INotificationWorkspaceInvitePayload,
        invitedByUserId: string
    ): Promise<void> {
        const encryptedInviteAcceptLink = this.encryptValue(
            inviteAcceptLink,
            userId
        );
        const payload: INotificationQueuePayload<INotificationWorkspaceInviteEncryptedPayload> =
            {
                userId,
                proceedBy: invitedByUserId,
                data: {
                    ...invite,
                    encryptedInviteAcceptLink,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationReferenceJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceInvite,
                reference: invite.reference,
            }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.workspaceInvite,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    /** Queues the workspace join-request notification for one reviewer (workspace owner/admin); call once per reviewer `userId`. */
    async sendWorkspaceJoinRequest(
        userId: string,
        {
            joinRequestReviewLink,
            ...joinRequest
        }: INotificationWorkspaceJoinRequestPayload,
        requestedByUserId: string
    ): Promise<void> {
        const encryptedJoinRequestReviewLink = this.encryptValue(
            joinRequestReviewLink,
            userId
        );
        const payload: INotificationQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload> =
            {
                userId,
                proceedBy: requestedByUserId,
                data: {
                    ...joinRequest,
                    encryptedJoinRequestReviewLink,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationWorkspaceUserJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceJoinRequest,
                workspaceId: joinRequest.workspaceId,
                userId,
            }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.workspaceJoinRequest,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendWorkspaceJoinAccepted(
        userId: string,
        payload: INotificationWorkspaceJoinAcceptedPayload,
        reviewedByUserId: string
    ): Promise<void> {
        const queuePayload: INotificationQueuePayload<INotificationWorkspaceJoinAcceptedPayload> =
            {
                userId,
                data: payload,
                proceedBy: reviewedByUserId,
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationWorkspaceUserJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceJoinAccepted,
                workspaceId: payload.workspaceId,
                userId,
            }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.workspaceJoinAccepted,
            queuePayload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendWorkspaceJoinRejected(
        userId: string,
        payload: INotificationWorkspaceJoinRejectedPayload,
        reviewedByUserId: string
    ): Promise<void> {
        const queuePayload: INotificationQueuePayload<INotificationWorkspaceJoinRejectedPayload> =
            {
                userId,
                data: payload,
                proceedBy: reviewedByUserId,
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationWorkspaceUserJobIdPattern,
            {
                process: EnumNotificationProcess.workspaceJoinRejected,
                workspaceId: payload.workspaceId,
                userId,
            }
        );

        await this.notificationQueue.add(
            EnumNotificationProcess.workspaceJoinRejected,
            queuePayload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }
}
