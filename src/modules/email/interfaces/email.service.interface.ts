import { EmailMobileNumberVerifiedDto } from '@modules/email/dtos/email.mobile-number-verified.dto';
import { EmailResetPasswordDto } from '@modules/email/dtos/email.reset-password.dto';
import { EmailSendDto } from '@modules/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from '@modules/email/dtos/email.temp-password.dto';
import { EmailVerificationDto } from '@modules/email/dtos/email.verification.dto';
import { EmailVerifiedDto } from '@modules/email/dtos/email.verified.dto';

export interface IEmailService {
    sendChangePassword({ username, email }: EmailSendDto): Promise<boolean>;
    sendWelcome({ username, email }: EmailSendDto): Promise<boolean>;
    sendCreateByAdmin(
        { username, email }: EmailSendDto,
        { password, passwordExpiredAt }: EmailTempPasswordDto
    ): Promise<boolean>;
    sendTempPassword(
        { username, email }: EmailSendDto,
        { password, passwordExpiredAt }: EmailTempPasswordDto
    ): Promise<boolean>;
    sendResetPassword(
        { username, email }: EmailSendDto,
        { expiredDate, link }: EmailResetPasswordDto
    ): Promise<boolean>;
    sendVerification(
        { username, email }: EmailSendDto,
        { expiredAt, reference, token, link }: EmailVerificationDto
    ): Promise<boolean>;
    sendEmailVerified(
        { username, email }: EmailSendDto,
        { reference }: EmailVerifiedDto
    ): Promise<boolean>;
    sendMobileNumberVerified(
        { username, email }: EmailSendDto,
        { reference, mobileNumber }: EmailMobileNumberVerifiedDto
    ): Promise<boolean>;
}
