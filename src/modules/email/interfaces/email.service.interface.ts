import {
    ICreateByAdminPayload,
    IEmailForgotPasswordPayload,
    IEmailNewLoginPayload,
    IEmailSendPayload,
    IEmailTempPasswordPayload,
    IEmailVerificationPayload,
    IEmailVerifiedPayload,
} from '@modules/email/interfaces/email.interface';

export interface IEmailService {
    sendChangePassword(
        userId: string,
        { email, username }: IEmailSendPayload
    ): Promise<void>;
    sendWelcomeByAdmin(
        userId: string,
        { email, username }: IEmailSendPayload,
        {
            passwordCreatedAt,
            passwordExpiredAt,
            password,
        }: ICreateByAdminPayload
    ): Promise<void>;
    sendVerification(
        userId: string,
        { email, username }: IEmailSendPayload,
        {
            expiredAt,
            expiredInMinutes,
            link,
            reference,
        }: IEmailVerificationPayload
    ): Promise<void>;
    sendTemporaryPassword(
        userId: string,
        { email, username }: IEmailSendPayload,
        {
            password,
            passwordCreatedAt,
            passwordExpiredAt,
        }: IEmailTempPasswordPayload
    ): Promise<void>;
    sendWelcome(
        userId: string,
        { email, username }: IEmailSendPayload
    ): Promise<void>;
    sendVerified(
        userId: string,
        { email, username }: IEmailSendPayload,
        { reference }: IEmailVerifiedPayload
    ): Promise<void>;
    sendForgotPassword(
        userId: string,
        { email, username }: IEmailSendPayload,
        {
            expiredAt,
            expiredInMinutes,
            link,
            reference,
        }: IEmailForgotPasswordPayload,
        resendInMinutes: number
    ): Promise<void>;
    sendResetTwoFactorByAdmin(
        userId: string,
        { email, username }: IEmailSendPayload
    ): Promise<void>;
    sendNewLogin(
        sendNewLogin: string,
        { email, username }: IEmailSendPayload,
        {
            loginFrom,
            loginWith,
            loginAt,
            userAgent,
            ipAddress,
        }: IEmailNewLoginPayload
    ): Promise<void>;
}
