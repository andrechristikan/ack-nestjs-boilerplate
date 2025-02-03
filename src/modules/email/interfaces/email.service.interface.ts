import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { EmailMobileNumberVerifiedDto } from 'src/modules/email/dtos/email.mobile-number-verified.dto';
import { EmailResetPasswordDto } from 'src/modules/email/dtos/email.reset-password.dto';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from 'src/modules/email/dtos/email.temp-password.dto';
import { EmailVerificationDto } from 'src/modules/email/dtos/email.verification.dto';
import { EmailVerifiedDto } from 'src/modules/email/dtos/email.verified.dto';

export interface IEmailService {
    importChangePassword(): Promise<boolean>;
    getChangePassword(): Promise<GetTemplateCommandOutput>;
    deleteChangePassword(): Promise<boolean>;
    sendChangePassword({ name, email }: EmailSendDto): Promise<boolean>;
    importWelcome(): Promise<boolean>;
    getWelcome(): Promise<GetTemplateCommandOutput>;
    deleteWelcome(): Promise<boolean>;
    sendWelcome({ name, email }: EmailSendDto): Promise<boolean>;
    importCreate(): Promise<boolean>;
    getCreate(): Promise<GetTemplateCommandOutput>;
    deleteCreate(): Promise<boolean>;
    sendCreate(
        { name, email }: EmailSendDto,
        { password, passwordExpiredAt }: EmailTempPasswordDto
    ): Promise<boolean>;
    importTempPassword(): Promise<boolean>;
    getTempPassword(): Promise<GetTemplateCommandOutput>;
    deleteTempPassword(): Promise<boolean>;
    sendTempPassword(
        { name, email }: EmailSendDto,
        { password, passwordExpiredAt }: EmailTempPasswordDto
    ): Promise<boolean>;
    importResetPassword(): Promise<boolean>;
    getResetPassword(): Promise<GetTemplateCommandOutput>;
    deleteResetPassword(): Promise<boolean>;
    sendResetPassword(
        { name, email }: EmailSendDto,
        { expiredDate, url }: EmailResetPasswordDto
    ): Promise<boolean>;
    importVerification(): Promise<boolean>;
    getVerification(): Promise<GetTemplateCommandOutput>;
    deleteVerification(): Promise<boolean>;
    sendVerification(
        { name, email }: EmailSendDto,
        { expiredAt, reference, otp }: EmailVerificationDto
    ): Promise<boolean>;
    importEmailVerified(): Promise<boolean>;
    getEmailVerified(): Promise<GetTemplateCommandOutput>;
    deleteEmailVerified(): Promise<boolean>;
    sendEmailVerified(
        { name, email }: EmailSendDto,
        { reference }: EmailVerifiedDto
    ): Promise<boolean>;
    importMobileNumberVerified(): Promise<boolean>;
    getMobileNumberVerified(): Promise<GetTemplateCommandOutput>;
    deleteMobileNumberVerified(): Promise<boolean>;
    sendMobileNumberVerified(
        { name, email }: EmailSendDto,
        { reference, mobileNumber }: EmailMobileNumberVerifiedDto
    ): Promise<boolean>;
}
