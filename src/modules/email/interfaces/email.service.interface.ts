import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { EmailResetPasswordDto } from 'src/modules/email/dtos/email.reset-password.dto';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from 'src/modules/email/dtos/email.temp-password.dto';

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
}
