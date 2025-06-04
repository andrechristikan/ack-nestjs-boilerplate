import { EmailCreateDto } from '@module/email/dtos/email.create.dto';
import { EmailResetPasswordDto } from '@module/email/dtos/email.reset-password.dto';
import { EmailSendDto } from '@module/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from '@module/email/dtos/email.temp-password.dto';

export interface IEmailProcessor {
    processWelcome(data: EmailSendDto): Promise<boolean>;
    processCreate(
        { name, email }: EmailSendDto,
        { password, passwordExpiredAt }: EmailCreateDto
    ): Promise<boolean>;
    processChangePassword(data: EmailSendDto): Promise<boolean>;
    processTempPassword(
        { name, email }: EmailSendDto,
        { password, passwordExpiredAt }: EmailTempPasswordDto
    ): Promise<boolean>;
    processResetPassword(
        data: EmailSendDto,
        resetPassword: EmailResetPasswordDto
    ): Promise<boolean>;
}
