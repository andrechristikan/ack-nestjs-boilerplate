import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from 'src/modules/email/dtos/email.temp-password.dto';
import { EmailWelcomeAdminDto } from 'src/modules/email/dtos/email.welcome-admin.dto';

export interface IEmailService {
    createChangePassword(): Promise<boolean>;
    getChangePassword(): Promise<GetTemplateCommandOutput>;
    deleteChangePassword(): Promise<boolean>;
    sendChangePassword({ name, email }: EmailSendDto): Promise<boolean>;
    createWelcome(): Promise<boolean>;
    getWelcome(): Promise<GetTemplateCommandOutput>;
    deleteWelcome(): Promise<boolean>;
    sendWelcome({ name, email }: EmailSendDto): Promise<boolean>;
    createWelcomeAdmin(): Promise<boolean>;
    getWelcomeAdmin(): Promise<GetTemplateCommandOutput>;
    deleteWelcomeAdmin(): Promise<boolean>;
    sendWelcomeAdmin(
        { name, email }: EmailSendDto,
        { password, passwordExpiredAt }: EmailWelcomeAdminDto
    ): Promise<boolean>;
    createTempPassword(): Promise<boolean>;
    getTempPassword(): Promise<GetTemplateCommandOutput>;
    deleteTempPassword(): Promise<boolean>;
    sendTempPassword(
        { name, email }: EmailSendDto,
        { password, passwordExpiredAt }: EmailTempPasswordDto
    ): Promise<boolean>;
}
