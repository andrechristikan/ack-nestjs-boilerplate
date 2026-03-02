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
import { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
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

export interface INotificationService {
    getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.NotificationSelect,
            Prisma.NotificationWhereInput
        >
    ): Promise<IResponsePagingReturn<NotificationResponseDto>>;
    getListUserSetting(
        userId: string
    ): Promise<IResponseReturn<NotificationUserSettingResponseDto>>;
    markAsRead(
        userId: string,
        notificationId: string
    ): Promise<IResponseReturn<void>>;
    markAllAsRead(userId: string): Promise<IResponseReturn<void>>;
    updateUserSetting(
        userId: string,
        data: NotificationUserSettingRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    sendWelcomeByAdmin(
        { email, username, userId }: INotificationSendPayload,
        password: INotificationCreateByAdminPayload,
        createdBy: string
    ): Promise<void>;
    sendTemporaryPasswordByAdmin(
        { username, email, userId }: INotificationSendPayload,
        password: INotificationTemporaryPasswordPayload,
        createdBy: string
    ): Promise<void>;
    sendWelcome(
        { email, username, userId }: INotificationSendPayload,
        verification: INotificationEmailVerificationPayload
    ): Promise<void>;
    sendWelcomeSocial(
        { email, username, userId }: INotificationSendPayload,
        loginWith: EnumUserLoginWith,
        loginFrom: EnumUserLoginFrom
    ): Promise<void>;
    sendChangePassword({
        userId,
        ...payload
    }: INotificationSendPayload): Promise<void>;
    sendVerifiedEmail(
        { userId, ...payload }: INotificationSendPayload,
        verified: INotificationEmailVerifiedPayload
    ): Promise<void>;
    sendVerificationEmail(
        { userId, ...payload }: INotificationSendPayload,
        verification: INotificationEmailVerificationPayload
    ): Promise<void>;
    sendForgotPassword(
        { userId, ...payload }: INotificationSendPayload,
        forgotPassword: INotificationForgotPasswordPayload
    ): Promise<void>;
    sendResetPassword({
        username,
        email,
        userId,
    }: INotificationSendPayload): Promise<void>;
    sendResetTwoFactorByAdmin(
        { username, email, userId }: INotificationSendPayload,
        createdBy: string
    ): Promise<void>;
    sendNewDeviceLogin(
        { username, email }: INotificationSendPayload,
        newDeviceLogin: INotificationNewDeviceLoginPayload
    ): Promise<void>;
    sendPublishTermPolicy(
        payload: INotificationPublishTermPolicyPayload,
        publishedBy: string
    ): Promise<void>;
}
