import { EmailCreateByAdminDto } from '@modules/email/dtos/email.create-by-admin.dto';
import { EmailForgotPasswordDto } from '@modules/email/dtos/email.forgot-password.dto';
import { EmailSendDto } from '@modules/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from '@modules/email/dtos/email.temp-password.dto';
import { EmailVerificationDto } from '@modules/email/dtos/email.verification.dto';
import { EmailVerifiedDto } from '@modules/email/dtos/email.verified.dto';

export interface IEmailService {
    sendChangePassword(
        userId: string,
        { email, username }: EmailSendDto
    ): Promise<void>;
    sendWelcomeByAdmin(
        userId: string,
        { email, username }: EmailSendDto,
        {
            passwordCreatedAt,
            passwordExpiredAt,
            password,
        }: EmailCreateByAdminDto
    ): Promise<void>;
    sendVerification(
        userId: string,
        { email, username }: EmailSendDto,
        { expiredAt, expiredInMinutes, link, reference }: EmailVerificationDto
    ): Promise<void>;
    sendTemporaryPassword(
        userId: string,
        { email, username }: EmailSendDto,
        { password, passwordCreatedAt, passwordExpiredAt }: EmailTempPasswordDto
    ): Promise<void>;
    sendWelcome(
        userId: string,
        { email, username }: EmailSendDto
    ): Promise<void>;
    sendVerified(
        userId: string,
        { email, username }: EmailSendDto,
        { reference }: EmailVerifiedDto
    ): Promise<void>;
    sendForgotPassword(
        userId: string,
        { email, username }: EmailSendDto,
        {
            expiredAt,
            expiredInMinutes,
            link,
            reference,
        }: EmailForgotPasswordDto,
        resendInMinutes: number
    ): Promise<void>;
    sendResetTwoFactorByAdmin(
        userId: string,
        { email, username }: EmailSendDto
    ): Promise<void>;
}
