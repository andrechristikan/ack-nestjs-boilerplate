import { ResponseUtil } from '@common/response/utils/response.util';
import {
    EnumNotificationChannel,
    EnumNotificationType,
    Notification,
    NotificationUserSetting,
} from '@generated/prisma-client';
import { NotificationSettingUpdateAllowedCombinations } from '@modules/notification/constants/notification.constant';
import { NotificationUserSettingDto } from '@modules/notification/dtos/notification.user-setting.dto';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationInvalidChannelException } from '@modules/notification/exceptions/notification.invalid-channel.exception';
import { NotificationInvalidTypeException } from '@modules/notification/exceptions/notification.invalid-type.exception';
import {
    INotificationAcceptTermPolicyPayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
    INotificationWorkerBulkPayload,
    INotificationWorkerPayload,
} from '@modules/notification/interfaces/notification.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

/**
 * Enqueues jobs onto the main notification queue and maps notification entities to response DTOs.
 */
@Injectable()
export class NotificationUtil {
    constructor(
        @InjectQueue(EnumQueue.notification)
        private readonly notificationQueue: Queue,
        private readonly responseUtil: ResponseUtil
    ) {}

    /** Queues the admin-created welcome notification carrying the temporary password. */
    async sendWelcomeByAdmin(
        userId: string,
        {
            password,
            passwordCreatedAt,
            passwordExpiredAt,
        }: INotificationWelcomeByAdminPayload,
        createdBy: string
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.welcomeByAdmin,
            {
                userId,
                proceedBy: createdBy,
                data: {
                    password,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
            } as INotificationWorkerPayload<INotificationWelcomeByAdminPayload>,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.welcomeByAdmin}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Queues the welcome notification for a new user (bundles the email verification link). */
    async sendWelcome(
        userId: string,
        {
            link,
            expiredAt,
            expiredInMinutes,
            reference,
        }: INotificationVerificationEmailPayload
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.welcome,
            {
                userId,
                data: {
                    link,
                    expiredAt,
                    expiredInMinutes,
                    reference,
                },
                proceedBy: userId,
            } as INotificationWorkerPayload<INotificationVerificationEmailPayload>,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.welcome}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Queues the welcome notification for a social-login signup. */
    async sendWelcomeSocial(userId: string): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.welcomeSocial,
            {
                userId,
                proceedBy: userId,
            } as INotificationWorkerPayload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.welcomeSocial}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Queues the admin-issued temporary password notification. */
    async sendTemporaryPasswordByAdmin(
        userId: string,
        {
            password,
            passwordCreatedAt,
            passwordExpiredAt,
        }: INotificationTemporaryPasswordPayload,
        createdBy: string
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.temporaryPasswordByAdmin,
            {
                userId,
                data: {
                    password,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
                proceedBy: createdBy,
            } as INotificationWorkerPayload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationProcess.temporaryPasswordByAdmin}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Queues the password change confirmation notification. */
    async sendChangePassword(userId: string): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.changePassword,
            {
                userId,
                proceedBy: userId,
            } as INotificationWorkerPayload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.changePassword}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Queues the email-verified confirmation notification. */
    async sendVerifiedEmail(
        userId: string,
        verified: INotificationVerifiedEmailPayload
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.verifiedEmail,
            {
                userId,
                data: verified,
                proceedBy: userId,
            } as INotificationWorkerPayload<INotificationVerifiedEmailPayload>,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.verifiedEmail}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Queues the email verification link notification. */
    async sendVerificationEmail(
        userId: string,
        {
            expiredAt,
            expiredInMinutes,
            link,
            reference,
        }: INotificationVerificationEmailPayload
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.verificationEmail,
            {
                userId,
                data: {
                    link,
                    expiredAt,
                    expiredInMinutes,
                    reference,
                },
                proceedBy: userId,
            } as INotificationWorkerPayload<INotificationVerificationEmailPayload>,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.verificationEmail}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Queues the forgot-password reset link notification. */
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
        await this.notificationQueue.add(
            EnumNotificationProcess.forgotPassword,
            {
                userId,
                data: {
                    link,
                    expiredAt,
                    expiredInMinutes,
                    reference,
                    resendInMinutes,
                },
                proceedBy: userId,
            } as INotificationWorkerPayload<INotificationForgotPasswordPayload>,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.forgotPassword}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Queues the password reset confirmation notification. */
    async sendResetPassword(userId: string): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.resetPassword,
            {
                userId,
                proceedBy: userId,
            } as INotificationWorkerPayload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.resetPassword}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Queues the admin-triggered two-factor reset notification. */
    async sendResetTwoFactorByAdmin(
        userId: string,
        createdBy: string
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.resetTwoFactorByAdmin,
            {
                userId,
                proceedBy: createdBy,
            } as INotificationWorkerPayload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationProcess.resetTwoFactorByAdmin}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Queues the new-device login alert notification. */
    async sendNewDeviceLogin(
        userId: string,
        newDevice: INotificationNewDeviceLoginPayload
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.newDeviceLogin,
            {
                userId,
                data: newDevice,
                proceedBy: userId,
            } as INotificationWorkerPayload<INotificationNewDeviceLoginPayload>,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationProcess.newDeviceLogin}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Queues the bulk term-policy publication notification. */
    async sendPublishTermPolicy(
        payload: INotificationPublishTermPolicyPayload,
        publishedBy: string
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.publishTermPolicy,
            {
                proceedBy: publishedBy,
                data: payload,
            } as INotificationWorkerBulkPayload<INotificationPublishTermPolicyPayload>,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.publishTermPolicy}-${payload.type}-${payload.version}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Queues the mobile-number-verified confirmation notification. */
    async sendVerifiedMobileNumber(
        userId: string,
        verifiedMobile: INotificationVerifiedMobileNumberPayload
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.verifiedMobileNumber,
            {
                userId,
                data: verifiedMobile,
                proceedBy: userId,
            } as INotificationWorkerPayload<INotificationVerifiedMobileNumberPayload>,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.verifiedMobileNumber}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Queues the user-accepted-term-policy notification. */
    async sendUserAcceptTermPolicy(
        userId: string,
        payload: INotificationAcceptTermPolicyPayload
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.userAcceptTermPolicy,
            {
                userId,
                data: payload,
                proceedBy: userId,
            } as INotificationWorkerPayload<INotificationAcceptTermPolicyPayload>,
            {
                priority: EnumQueuePriority.low,
                deduplication: {
                    id: `${EnumNotificationProcess.userAcceptTermPolicy}-${userId}-${payload.termPolicyId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /** Rejects any type/channel pair not in the allowed combinations list. */
    validateUserSetting(
        type: EnumNotificationType,
        channel: EnumNotificationChannel
    ): void {
        const validType = NotificationSettingUpdateAllowedCombinations.find(
            e => e.type === type
        );

        if (!validType) {
            throw new NotificationInvalidTypeException();
        }

        if (!validType.channels.includes(channel)) {
            throw new NotificationInvalidChannelException();
        }
    }

    mapList(notifications: Notification[]): NotificationResponseDto[] {
        return this.responseUtil.serialize(
            NotificationResponseDto,
            notifications
        );
    }

    mapUserSettingList(
        settings: NotificationUserSetting[]
    ): NotificationUserSettingDto[] {
        return this.responseUtil.serialize(
            NotificationUserSettingDto,
            settings
        );
    }
}
