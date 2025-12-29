import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { EmailService } from '@modules/email/services/email.service';
import { NotificationRegisterPushTokenRequestDto } from '@modules/notification/dtos/request/notification.push-token.request.dto';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { EnumNotificationDelivery } from '@modules/notification/enums/notification.enum';
import { INotificationService } from '@modules/notification/interfaces/notification.service.interface';
import { NotificationPushTokenRepository } from '@modules/notification/repositories/notification-push-token.repository';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationSettingRepository } from '@modules/notification/repositories/notification-setting.repository';
import { NotificationPushService } from '@modules/notification/services/notification.push.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { HelperService } from '@common/helper/services/helper.service';
import { Injectable } from '@nestjs/common';
import {
    EnumNotificationChannel,
    EnumNotificationSettingType,
    EnumNotificationType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    Notification,
} from '@prisma/client';

@Injectable()
export class NotificationService implements INotificationService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUtil: NotificationUtil,
        private readonly notificationSettingRepository: NotificationSettingRepository,
        private readonly notificationPushService: NotificationPushService,
        private readonly notificationPushTokenRepository: NotificationPushTokenRepository,
        private readonly emailService: EmailService,
        private readonly helperService: HelperService
    ) {}

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<NotificationResponseDto>> {
        const { data, ...others } =
            await this.notificationRepository.findWithPaginationCursor(
                userId,
                pagination
            );

        const notifications: NotificationResponseDto[] =
            this.notificationUtil.mapList(data);
        return {
            data: notifications,
            ...others,
        };
    }

    async createLoginNotification(
        user: { id: string; email?: string; username?: string },
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        requestLog: IRequestLog,
        delivery: EnumNotificationDelivery = EnumNotificationDelivery.silent
    ): Promise<Notification> {
        const notification = await this.notificationRepository.createLogin(
            user.id,
            loginFrom,
            loginWith,
            requestLog
        );

        const [emailEnabled, pushEnabled] = await Promise.all([
            this.isChannelEnabled(
                user.id,
                EnumNotificationChannel.email,
                delivery
            ),
            this.isChannelEnabled(
                user.id,
                EnumNotificationChannel.push,
                delivery
            ),
        ]);

        if (emailEnabled && user.email && user.username) {
            await this.emailService.sendLoginNotification(
                user.id,
                {
                    email: user.email,
                    username: user.username,
                },
                {
                    loginFrom,
                    loginWith,
                    ipAddress: requestLog.ipAddress,
                    loginAt: this.helperService.dateFormatToIso(
                        this.helperService.dateCreate()
                    ),
                }
            );
        }

        if (pushEnabled) {
            await this.notificationPushService.enqueueLogin(
                user.id,
                EnumNotificationType.login,
                'Login',
                `Login from ${loginFrom} via ${loginWith}`,
                {
                    loginFrom,
                    loginWith,
                    ipAddress: requestLog.ipAddress,
                    userAgent: requestLog.userAgent,
                }
            );
        }

        return notification;
    }

    async registerPushToken(
        userId: string,
        sessionId: string,
        { token, provider }: NotificationRegisterPushTokenRequestDto,
        userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        await this.notificationPushTokenRepository.register(
            userId,
            sessionId,
            token,
            provider,
            userAgent
        );

        return;
    }

    private async isChannelEnabled(
        userId: string,
        channel: EnumNotificationChannel,
        delivery: EnumNotificationDelivery
    ): Promise<boolean> {
        if (delivery === EnumNotificationDelivery.silent) {
            return false;
        }

        if (delivery === EnumNotificationDelivery.email) {
            return (
                channel === EnumNotificationChannel.email &&
                (await this.notificationSettingRepository.isEnabled(
                    userId,
                    channel,
                    EnumNotificationSettingType.login
                ))
            );
        }

        if (delivery === EnumNotificationDelivery.push) {
            return (
                channel === EnumNotificationChannel.push &&
                (await this.notificationSettingRepository.isEnabled(
                    userId,
                    channel,
                    EnumNotificationSettingType.login
                ))
            );
        }

        return this.notificationSettingRepository.isEnabled(
            userId,
            channel,
            EnumNotificationSettingType.login
        );
    }
}
