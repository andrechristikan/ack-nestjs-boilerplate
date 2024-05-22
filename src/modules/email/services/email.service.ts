import { Injectable } from '@nestjs/common';
import { AwsSESService } from 'src/common/aws/services/aws.ses.service';
import { ENUM_EMAIL } from 'src/modules/email/constants/email.enum.constant';
import { title } from 'case';
import { ConfigService } from '@nestjs/config';
import { IEmailService } from 'src/modules/email/interfaces/email.service.interface';
import { readFileSync } from 'fs';
import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';

@Injectable()
export class EmailService implements IEmailService {
    private readonly fromEmail: string;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly configService: ConfigService
    ) {
        this.fromEmail = this.configService.get<string>('email.fromEmail');
    }

    async createChangePassword(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_EMAIL.CHANGE_PASSWORD,
                subject: `Change Password`,
                htmlBody: readFileSync(
                    './templates/email.change-password.template.html',
                    'utf8'
                ),
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async getChangePassword(): Promise<GetTemplateCommandOutput> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: ENUM_EMAIL.CHANGE_PASSWORD,
            });

            return template;
        } catch (err: unknown) {
            return;
        }
    }

    async deleteChangePassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_EMAIL.CHANGE_PASSWORD,
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async sendChangePassword({ name, email }: EmailSendDto): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_EMAIL.CHANGE_PASSWORD,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    name: title(name),
                },
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async createSignUp(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_EMAIL.SIGN_UP,
                subject: `Welcome`,
                htmlBody: readFileSync(
                    './templates/email.sign-up.template.html',
                    'utf8'
                ),
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async getSignUp(): Promise<GetTemplateCommandOutput> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: ENUM_EMAIL.SIGN_UP,
            });

            return template;
        } catch (err: unknown) {
            return;
        }
    }

    async deleteSignUp(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_EMAIL.SIGN_UP,
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async sendSignUp({ name, email }: EmailSendDto): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_EMAIL.SIGN_UP,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    name: title(name),
                },
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }
}
