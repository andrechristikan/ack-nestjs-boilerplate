import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
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
        private readonly helperEncryptionService: HelperEncryptionService
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

        await this.notificationQueue.add(
            EnumNotificationProcess.welcomeByAdmin,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.welcomeByAdmin}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.welcome,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.welcome}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.welcomeSocial,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.welcomeSocial}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.temporaryPasswordByAdmin,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationProcess.temporaryPasswordByAdmin}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.changePassword,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.changePassword}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.verifiedEmail,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.verifiedEmail}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.verificationEmail,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.verificationEmail}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.forgotPassword,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.forgotPassword}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.resetPassword,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.resetPassword}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.resetTwoFactorByAdmin,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationProcess.resetTwoFactorByAdmin}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.newDeviceLogin,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationProcess.newDeviceLogin}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.publishTermPolicy,
            queuePayload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.publishTermPolicy}-${payload.type}-${payload.version}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.verifiedMobileNumber,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.verifiedMobileNumber}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.userAcceptTermPolicy,
            queuePayload,
            {
                priority: EnumQueuePriority.low,
                deduplication: {
                    id: `${EnumNotificationProcess.userAcceptTermPolicy}-${userId}-${payload.termPolicyId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.workspaceInvite,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.workspaceInvite}-${invite.reference}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.workspaceJoinRequest,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.workspaceJoinRequest}-${joinRequest.workspaceId}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.workspaceJoinAccepted,
            queuePayload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.workspaceJoinAccepted}-${payload.workspaceId}-${userId}`,
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

        await this.notificationQueue.add(
            EnumNotificationProcess.workspaceJoinRejected,
            queuePayload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.workspaceJoinRejected}-${payload.workspaceId}-${userId}`,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }
}
