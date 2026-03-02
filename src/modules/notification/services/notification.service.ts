import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    Prisma,
} from '@generated/prisma-client';
import { EmailUtil } from '@modules/email/utils/email.util';
import { NotificationUserSettingDto } from '@modules/notification/dtos/notification.user-setting.dto';
import { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';
import {
    INotificationCreateByAdminPayload,
    INotificationEmailVerificationPayload,
    INotificationEmailVerifiedPayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationSendPayload,
    INotificationTemporaryPasswordPayload,
} from '@modules/notification/interfaces/notification.interface';
import { INotificationService } from '@modules/notification/interfaces/notification.service.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

@Injectable()
export class NotificationService implements INotificationService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUtil: NotificationUtil,
        private readonly emailUtil: EmailUtil
    ) {}

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.NotificationSelect,
            Prisma.NotificationWhereInput
        >
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

    async getListUserSetting(
        userId: string
    ): Promise<IResponseReturn<NotificationUserSettingResponseDto>> {
        const userSettings =
            await this.notificationRepository.findUserSetting(userId);

        const settings: NotificationUserSettingDto[] =
            this.notificationUtil.mapUserSettingList(userSettings);

        return {
            data: {
                settings: settings,
            },
        };
    }

    async markAsRead(
        userId: string,
        notificationId: string
    ): Promise<IResponseReturn<void>> {
        const checkExist = await this.notificationRepository.existById(
            userId,
            notificationId
        );
        if (!checkExist) {
            throw new NotFoundException({
                statusCode: EnumNotificationStatusCodeError.notFound,
                message: 'notification.error.notFound',
            });
        } else if (checkExist.isRead) {
            throw new BadRequestException({
                statusCode: EnumNotificationStatusCodeError.alreadyRead,
                message: 'notification.error.alreadyRead',
            });
        }

        await this.notificationRepository.markAsRead(userId, notificationId);

        return;
    }

    async markAllAsRead(userId: string): Promise<IResponseReturn<void>> {
        const batchUpdated =
            await this.notificationRepository.markAllAsRead(userId);

        return {
            metadata: {
                messageProperties: {
                    count: batchUpdated.count,
                },
            },
        };
    }

    async updateUserSetting(
        userId: string,
        data: NotificationUserSettingRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        await this.notificationRepository.updateUserSetting(
            userId,
            data,
            requestLog
        );

        return;
    }

    async sendWelcomeByAdmin(
        { email, username, userId }: INotificationSendPayload,
        password: INotificationCreateByAdminPayload,
        createdBy: string
    ): Promise<void> {
        await Promise.all([
            this.emailUtil.sendWelcomeByAdmin(
                userId,
                { email, username },
                password
            ),
            this.notificationRepository.createWelcomeByAdmin(
                userId,
                username,
                createdBy
            ),
        ]);
    }

    async sendTemporaryPasswordByAdmin(
        { username, email, userId }: INotificationSendPayload,
        password: INotificationTemporaryPasswordPayload,
        createdBy: string
    ): Promise<void> {
        await Promise.all([
            this.emailUtil.sendTemporaryPasswordByAdmin(
                userId,
                { email, username },
                password
            ),
            this.notificationRepository.createTemporaryPasswordByAdmin(
                userId,
                username,
                createdBy
            ),
            this.notificationUtil.sendPushTemporaryPasswordByAdmin({
                userId,
                username,
            }),
        ]);
    }

    async sendWelcome(
        { email, username, userId }: INotificationSendPayload,
        verification: INotificationEmailVerificationPayload
    ): Promise<void> {
        await Promise.all([
            this.emailUtil.sendWelcome(userId, { email, username }),
            this.emailUtil.sendVerification(
                userId,
                { email, username },
                verification
            ),
            this.notificationRepository.createWelcome(userId, username),
        ]);
    }

    async sendWelcomeSocial(
        { email, username, userId }: INotificationSendPayload,
        loginWith: EnumUserLoginWith,
        loginFrom: EnumUserLoginFrom
    ): Promise<void> {
        await Promise.all([
            this.emailUtil.sendWelcome(userId, { email, username }),
            this.notificationRepository.createWelcomeSocial(
                userId,
                username,
                loginWith,
                loginFrom
            ),
        ]);
    }

    async sendChangePassword({
        userId,
        ...payload
    }: INotificationSendPayload): Promise<void> {
        await this.emailUtil.sendChangePassword(userId, payload);
    }

    async sendVerifiedEmail(
        { userId, ...payload }: INotificationSendPayload,
        verified: INotificationEmailVerifiedPayload
    ): Promise<void> {
        await this.emailUtil.sendVerifiedEmail(userId, payload, verified);
    }

    async sendVerificationEmail(
        { userId, ...payload }: INotificationSendPayload,
        verification: INotificationEmailVerificationPayload
    ): Promise<void> {
        await this.emailUtil.sendVerification(userId, payload, verification);
    }

    async sendForgotPassword(
        { userId, ...payload }: INotificationSendPayload,
        forgotPassword: INotificationForgotPasswordPayload
    ): Promise<void> {
        await this.emailUtil.sendForgotPassword(
            userId,
            payload,
            forgotPassword
        );
    }

    async sendResetPassword({
        username,
        email,
        userId,
    }: INotificationSendPayload): Promise<void> {
        await Promise.all([
            this.emailUtil.sendResetPassword(userId, {
                email,
                username,
            }),
            this.notificationRepository.createResetPassword(userId, username),
            this.notificationUtil.sendPushResetPassword({
                username,
                userId,
            }),
        ]);
    }

    async sendResetTwoFactorByAdmin(
        { username, email, userId }: INotificationSendPayload,
        createdBy: string
    ): Promise<void> {
        await Promise.all([
            this.emailUtil.sendResetTwoFactorByAdmin(userId, {
                email,
                username,
            }),
            this.notificationRepository.createResetTwoFactorByAdmin(
                userId,
                username,
                createdBy
            ),
            this.notificationUtil.sendPushResetTwoFactorByAdmin({
                username,
                userId,
            }),
        ]);
    }

    async sendNewDeviceLogin(
        { username, email, userId }: INotificationSendPayload,
        newDeviceLogin: INotificationNewDeviceLoginPayload
    ): Promise<void> {
        await Promise.all([
            this.emailUtil.sendNewDeviceLogin(
                userId,
                {
                    email,
                    username,
                },
                newDeviceLogin
            ),
            this.notificationUtil.sendPushNewDeviceLogin(
                {
                    username,
                    userId,
                },
                newDeviceLogin
            ),
            this.notificationRepository.createNewDeviceLogin(
                userId,
                username,
                newDeviceLogin.loginFrom,
                newDeviceLogin.loginWith,
                newDeviceLogin.requestLog.userAgent
            ),
        ]);
    }

    async sendPublishTermPolicy(
        payload: INotificationPublishTermPolicyPayload,
        publishedBy: string
    ): Promise<void> {
        await Promise.all([
            this.emailUtil.sendPublishTermPolicy(payload),
            this.notificationRepository.createPublishTermPolicy(
                payload,
                publishedBy
            ),
        ]);
    }

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
