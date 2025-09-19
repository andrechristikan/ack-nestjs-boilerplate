import { EmailCreateByAdminDto } from '@modules/email/dtos/email.create-by-admin.dto';
import { EmailMobileNumberVerifiedDto } from '@modules/email/dtos/email.mobile-number-verified.dto';
import { EmailResetPasswordDto } from '@modules/email/dtos/email.reset-password.dto';
import { EmailSendDto } from '@modules/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from '@modules/email/dtos/email.temp-password.dto';
import { EmailVerificationDto } from '@modules/email/dtos/email.verification.dto';
import { EmailVerifiedDto } from '@modules/email/dtos/email.verified.dto';

export interface IEmailProcessor {
    processChangePassword(data: EmailSendDto): Promise<boolean>;
    processWelcome(data: EmailSendDto): Promise<boolean>;
    processCreateByAdmin(
        data: EmailSendDto,
        createdByAdmin: EmailCreateByAdminDto
    ): Promise<boolean>;
    processTempPassword(
        data: EmailSendDto,
        tempPassword: EmailTempPasswordDto
    ): Promise<boolean>;
    processResetPassword(
        data: EmailSendDto,
        resetPassword: EmailResetPasswordDto
    ): Promise<boolean>;
    processVerification(
        data: EmailSendDto,
        verification: EmailVerificationDto
    ): Promise<boolean>;
    processEmailVerified(
        data: EmailSendDto,
        emailVerified: EmailVerifiedDto
    ): Promise<boolean>;
    processMobileNumberVerified(
        data: EmailSendDto,
        mobileNumberVerified: EmailMobileNumberVerifiedDto
    ): Promise<boolean>;
}
