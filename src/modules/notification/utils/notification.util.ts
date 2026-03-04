import { HelperService } from '@common/helper/services/helper.service';
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
import { BadRequestException, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { EnumQueue, EnumQueuePriority } from 'src/queues/enums/queue.enum';

@Injectable()
export class NotificationUtil {
    constructor(
        @InjectQueue(EnumQueue.notification)
        private readonly notificationQueue: Queue,
        private readonly messageService: MessageService,
        private readonly helperService: HelperService
    ) {}

    async sendWelcomeByAdmin(
        userId: string,
        {
            password,
            passwordCreatedAt,
            passwordExpiredAt,
        }: INotificationWelcomeByAdminPayload,
        createdBy: string
    ): Promise<void> {
        const encryptedPassword = this.helperService.simpleEncrypt(password);

        await this.notificationQueue.add(
            EnumNotificationProcess.welcomeByAdmin,
            {
                userId,
                proceedBy: createdBy,
                data: {
                    password: encryptedPassword,
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

    async sendWelcome(
        userId: string,
        {
            link,
            expiredAt,
            expiredInMinutes,
            reference,
        }: INotificationVerificationEmailPayload
    ): Promise<void> {
        const encryptedLink = this.helperService.simpleEncrypt(link);

        await this.notificationQueue.add(
            EnumNotificationProcess.welcome,
            {
                userId,
                data: {
                    link: encryptedLink,
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

    async sendTemporaryPasswordByAdmin(
        userId: string,
        {
            password,
            passwordCreatedAt,
            passwordExpiredAt,
        }: INotificationTemporaryPasswordPayload,
        createdBy: string
    ): Promise<void> {
        const encryptedPassword = this.helperService.simpleEncrypt(password);

        await this.notificationQueue.add(
            EnumNotificationProcess.temporaryPasswordByAdmin,
            {
                userId,
                data: {
                    password: encryptedPassword,
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

    async sendVerificationEmail(
        userId: string,
        {
            expiredAt,
            expiredInMinutes,
            link,
            reference,
        }: INotificationVerificationEmailPayload
    ): Promise<void> {
        const encryptedLink = this.helperService.simpleEncrypt(link);

        await this.notificationQueue.add(
            EnumNotificationProcess.verificationEmail,
            {
                userId,
                data: {
                    link: encryptedLink,
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
        const encryptedLink = this.helperService.simpleEncrypt(link);

        await this.notificationQueue.add(
            EnumNotificationProcess.forgotPassword,
            {
                userId,
                data: {
                    link: encryptedLink,
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

    mapList(notifications: Notification[]): NotificationResponseDto[] {
        return plainToInstance(NotificationResponseDto, notifications);
    }

    mapUserSettingList(
        settings: NotificationUserSetting[]
    ): NotificationUserSettingDto[] {
        return plainToInstance(NotificationUserSettingDto, settings);
    }
}
