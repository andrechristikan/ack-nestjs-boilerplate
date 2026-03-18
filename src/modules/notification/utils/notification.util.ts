import { MessageService } from '@common/message/services/message.service';
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
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';
import {
    INotificationAcceptTermPolicyPayload,
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
    INotificationWorkerBulkPayload,
    INotificationWorkerPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailUtil } from '@modules/notification/utils/notification.email.util';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { EnumQueue, EnumQueuePriority } from 'src/queues/enums/queue.enum';

/**
 * Central notification utility for multi-channel notifications.
 * Routes notifications to email, push, and in-app channels based on user preferences.
 * Encrypts sensitive data before enqueueing and validates notification settings.
 */
@Injectable()
export class NotificationUtil {
    constructor(
        @InjectQueue(EnumQueue.notification)
        private readonly notificationQueue: Queue,
        private readonly notificationEmailUtil: NotificationEmailUtil,
        private readonly messageService: MessageService
    ) {}

    /**
     * Queues welcome notification with temporary password sent by admin.
     *
     * @param userId - User receiving the notification
     * @param passwordData - Temporary password data (plaintext password, dates)
     * @param createdBy - Admin/user ID who initiated the action
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues welcome notification for new user with verification link.
     *
     * @param userId - User receiving the notification
     * @param verificationData - Email verification link data (link, expiry, reference)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues welcome notification for social login user.
     *
     * @param userId - User receiving the notification
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues temporary password notification sent by admin.
     *
     * @param userId - User receiving the notification
     * @param passwordData - Temporary password data (plaintext password, dates)
     * @param createdBy - Admin/user ID who initiated the action
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues password change confirmation notification.
     *
     * @param userId - User receiving the notification
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues email verification confirmation notification.
     *
     * @param userId - User receiving the notification
     * @param verified - Verified email data (reference)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues email verification link notification.
     *
     * @param userId - User receiving the notification
     * @param verificationData - Email verification link data (link, expiry, reference)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues forgot password reset link notification.
     *
     * @param userId - User receiving the notification
     * @param forgotPasswordData - Reset link data (link, expiry, reference, resend time)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues password reset confirmation notification.
     *
     * @param userId - User receiving the notification
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues 2FA reset notification sent by admin.
     *
     * @param userId - User receiving the notification
     * @param createdBy - Admin/user ID who initiated the action
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues new device login alert notification.
     *
     * @param userId - User receiving the notification
     * @param newDevice - Login details (device, IP, location, time)
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues term policy publication notification to multiple users.
     *
     * @param payload - Term policy publication data
     * @param publishedBy - Admin/user ID who published the policy
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues mobile number verification confirmation notification.
     *
     * @param userId - User receiving the notification
     * @param verifiedMobile - Verified mobile number and reference
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues user acceptance of term policy notification.
     *
     * @param userId - User receiving the notification
     * @param payload - Term policy version accepted by the user
     * @returns Promise resolving when job is enqueued
     */
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

    /**
     * Queues invite notification for a user.
     *
     * @param userId - User receiving the invitation
     * @param payload - Invite payload (link, expiry, reference, inviteType, roleScope, contextName)
     * @param proceedBy - User ID who initiated the invite
     * @returns Promise resolving when job is enqueued
     */
    async sendInvite(
        userId: string,
        {
            link,
            expiredAt,
            expiredInMinutes,
            reference,
            inviteType,
            roleScope,
            contextName,
        }: INotificationInvitePayload,
        proceedBy: string
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.invite,
            {
                userId,
                data: {
                    link,
                    expiredAt,
                    expiredInMinutes,
                    reference,
                    inviteType,
                    roleScope,
                    contextName,
                },
                proceedBy,
            } as INotificationWorkerPayload<INotificationInvitePayload>,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.invite}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /**
     * Queues tenant invite notification.
     * For registered users, uses orchestration queue (notification entity + channel fanout).
     * For unregistered users, sends direct email only.
     *
     * @param invitedEmail - Email address of the invitee
     * @param payload - Invite payload (tenantName, token, expiresAt, role)
     * @param sentBy - User ID who sent the invite
     * @param registeredUserId - Optional registered user id of invitee
     * @returns Promise resolving when job is enqueued
     */
    async sendTenantInvite(
        invitedEmail: string,
        payload: INotificationTenantInviteEmailPayload,
        sentBy: string,
        registeredUserId?: string
    ): Promise<void> {
        if (registeredUserId) {
            await this.notificationQueue.add(
                EnumNotificationProcess.tenantInvite,
                {
                    userId: registeredUserId,
                    data: payload,
                    proceedBy: sentBy,
                } as INotificationWorkerPayload<INotificationTenantInviteEmailPayload>,
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: `${EnumNotificationProcess.tenantInvite}-${registeredUserId}`,
                        ttl: 1000,
                    },
                }
            );

            return;
        }

        await this.notificationEmailUtil.sendTenantInvite(
            {
                userId: sentBy,
                notificationId: `${EnumNotificationProcess.tenantInvite}-${invitedEmail}`,
                email: invitedEmail,
                username: invitedEmail,
            },
            payload
        );
    }

    /**
     * Validates if a notification type/channel combination is allowed.
     * Throws error if combination is not in the allowed list.
     *
     * @param type - Notification type (userActivity, marketing, etc.)
     * @param channel - Delivery channel (email, push, inApp)
     * @throws {BadRequestException} If combination is not allowed
     */
    validateUserSetting(
        type: EnumNotificationType,
        channel: EnumNotificationChannel
    ): void {
        const validType = NotificationSettingUpdateAllowedCombinations.find(
            e => e.type === type
        );

        if (!validType) {
            throw new BadRequestException({
                statusCode: EnumNotificationStatusCodeError.invalidType,
                message: this.messageService.setMessage(
                    'notification.error.invalidType'
                ),
            });
        }

        if (!validType.channels.includes(channel)) {
            throw new BadRequestException({
                statusCode: EnumNotificationStatusCodeError.invalidChannel,
                message: this.messageService.setMessage(
                    'notification.error.invalidChannel'
                ),
            });
        }
    }

    /**
     * Maps notification entities to response DTOs.
     *
     * @param notifications - Array of notification entities from database
     * @returns Array of notification response DTOs
     */
    mapList(notifications: Notification[]): NotificationResponseDto[] {
        return plainToInstance(NotificationResponseDto, notifications);
    }

    /**
     * Maps user notification settings to response DTOs.
     *
     * @param settings - Array of user notification settings from database
     * @returns Array of notification setting response DTOs
     */
    mapUserSettingList(
        settings: NotificationUserSetting[]
    ): NotificationUserSettingDto[] {
        return plainToInstance(NotificationUserSettingDto, settings);
    }
}
