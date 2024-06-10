import { Injectable } from '@nestjs/common';
import { AwsSESService } from 'src/common/aws/services/aws.ses.service';
import { ENUM_EMAIL } from 'src/modules/email/constants/email.enum.constant';
import { title } from 'case';
import { ConfigService } from '@nestjs/config';
import { IEmailService } from 'src/modules/email/interfaces/email.service.interface';
import { readFileSync } from 'fs';
import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';
import { EmailSendTempPasswordDto } from 'src/modules/email/dtos/email.send-temp-password.dto';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ENUM_HELPER_DATE_FORMAT } from 'src/common/helper/constants/helper.enum.constant';

@Injectable()
export class EmailService implements IEmailService {
    private readonly fromEmail: string;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly helperDateService: HelperDateService,
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

    async createWelcome(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_EMAIL.WElCOME,
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

    async getWelcome(): Promise<GetTemplateCommandOutput> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: ENUM_EMAIL.WElCOME,
            });

            return template;
        } catch (err: unknown) {
            return;
        }
    }

    async deleteWelcome(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_EMAIL.WElCOME,
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async sendWelcome({ name, email }: EmailSendDto): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_EMAIL.WElCOME,
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

    async createTempPassword(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_EMAIL.TEMP_PASSWORD,
                subject: `Temporary Password`,
                htmlBody: readFileSync(
                    './templates/email.temp-password.template.html',
                    'utf8'
                ),
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async getTempPassword(): Promise<GetTemplateCommandOutput> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: ENUM_EMAIL.TEMP_PASSWORD,
            });

            return template;
        } catch (err: unknown) {
            return;
        }
    }

    async deleteTempPassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_EMAIL.TEMP_PASSWORD,
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async sendTempPassword(
        { name, email }: EmailSendDto,
        { password, expiredAt }: EmailSendTempPasswordDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_EMAIL.TEMP_PASSWORD,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    name: title(name),
                    password,
                    expiredAt: this.helperDateService.format(expiredAt, {
                        format: ENUM_HELPER_DATE_FORMAT.FRIENDLY_DATE_TIME,
                    }),
                },
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }
}
