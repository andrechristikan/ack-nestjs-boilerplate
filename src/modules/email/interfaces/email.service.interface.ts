import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';

export interface IEmailService {
    createChangePassword(): Promise<boolean>;
    getChangePassword(): Promise<GetTemplateCommandOutput>;
    deleteChangePassword(): Promise<boolean>;
    sendChangePassword({ name, email }: EmailSendDto): Promise<boolean>;
    createWelcome(): Promise<boolean>;
    getWelcome(): Promise<GetTemplateCommandOutput>;
    deleteWelcome(): Promise<boolean>;
    sendWelcome({ name, email }: EmailSendDto): Promise<boolean>;
}
