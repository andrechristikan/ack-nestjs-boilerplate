import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { INotificationService } from '@modules/notification/interfaces/notification.service.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService implements INotificationService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUtil: NotificationUtil
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

    // TODO:  see notification module
    // async markAsRead(
    //     userId: string,
    //     notificationId: string
    // ): Promise<IResponseReturn<void>> {
    //     const checkExist = await this.notificationRepository.existById(
    //         userId,
    //         notificationId
    //     );
    //     if (!checkExist) {
    //         throw new NotFoundException({
    //             statusCode: EnumNotificationStatusCodeError.notFound,
    //             message: 'notification.error.notFound',
    //         });
    //     } else if (checkExist.isRead) {
    //         throw new BadRequestException({
    //             statusCode: EnumNotificationStatusCodeError.alreadyRead,
    //             message: 'notification.error.alreadyRead',
    //         });
    //     }
    //     await this.notificationRepository.markAsRead(userId, notificationId);
    //     return;
    // }
    // async markAllAsRead(userId: string): Promise<IResponseReturn<void>> {
    //     await this.notificationRepository.markAllAsRead(userId);
    //     return;
    // }
    // async updateUserSetting(
    //     userId: string,
    //     data: NotificationUserSettingRequestDto,
    //     requestLog: IRequestLog
    // ): Promise<IResponseReturn<void>> {
    //     await this.notificationRepository.updateUserSetting(
    //         userId,
    //         data,
    //         requestLog
    //     );
    //     return;
    // }
    // async newLoginNotification(
    //     user: User,
    //     loginFrom: EnumUserLoginFrom,
    //     loginWith: EnumUserLoginWith,
    //     loginAt: Date,
    //     { ipAddress, userAgent }: IRequestLog
    // ): Promise<Notification> {
    //     await this.notificationRepository.createNewLogin(
    //         user.id,
    //         loginFrom,
    //         loginWith
    //     );
    //     // @note: post action
    //     await Promise.all([
    //         this.emailService.sendNewLogin(
    //             user.id,
    //             {
    //                 email: user.email,
    //                 username: user.username,
    //             },
    //             {
    //                 loginFrom,
    //                 loginWith,
    //                 ipAddress,
    //                 loginAt: this.helperService.dateFormatToIso(loginAt),
    //                 userAgent,
    //             }
    //         ),
    //         this.notificationPushService.enqueueLogin(
    //             user.id,
    //             EnumNotificationType.login,
    //             'Login',
    //             `Login from ${loginFrom} via ${loginWith}`,
    //             {
    //                 loginFrom,
    //                 loginWith,
    //                 ipAddress: requestLog.ipAddress,
    //                 userAgent: requestLog.userAgent,
    //             }
    //         ),
    //     ]);
    //     return;
    // }
    // async registerPushToken(
    //     userId: string,
    //     sessionId: string,
    //     { token, provider }: NotificationRegisterPushTokenRequestDto,
    //     userAgent: RequestUserAgentDto
    // ): Promise<IResponseReturn<void>> {
    //     await this.notificationPushTokenRepository.register(
    //         userId,
    //         sessionId,
    //         token,
    //         provider,
    //         userAgent
    //     );
    //     return;
    // }
    // private async isChannelEnabled(
    //     userId: string,
    //     channel: EnumNotificationChannel,
    //     delivery: EnumNotificationDelivery
    // ): Promise<boolean> {
    //     if (delivery === EnumNotificationDelivery.silent) {
    //         return false;
    //     }
    //     if (delivery === EnumNotificationDelivery.email) {
    //         return (
    //             channel === EnumNotificationChannel.email &&
    //             (await this.notificationSettingRepository.isEnabled(
    //                 userId,
    //                 channel,
    //                 EnumNotificationSettingType.login
    //             ))
    //         );
    //     }
    //     if (delivery === EnumNotificationDelivery.push) {
    //         return (
    //             channel === EnumNotificationChannel.push &&
    //             (await this.notificationSettingRepository.isEnabled(
    //                 userId,
    //                 channel,
    //                 EnumNotificationSettingType.login
    //             ))
    //         );
    //     }
    //     return this.notificationSettingRepository.isEnabled(
    //         userId,
    //         channel,
    //         EnumNotificationSettingType.login
    //     );
    // }
    // async revokePushToken(
    //     userId: string,
    //     sessionId: string
    // ): Promise<IResponseReturn<void>> {
    //     await this.notificationPushTokenRepository.revokeBySessionId(
    //         sessionId,
    //         userId
    //     );
    //     return;
    // }
}
