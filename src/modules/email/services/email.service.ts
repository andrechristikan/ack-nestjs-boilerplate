import { Injectable, Logger } from '@nestjs/common';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';
import { title } from 'case';
import { ConfigService } from '@nestjs/config';
import { IEmailService } from 'src/modules/email/interfaces/email.service.interface';
import { readFileSync } from 'fs';
import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { EmailTempPasswordDto } from 'src/modules/email/dtos/email.temp-password.dto';
import { AwsSESService } from 'src/modules/aws/services/aws.ses.service';
import { EmailResetPasswordDto } from 'src/modules/email/dtos/email.reset-password.dto';

@Injectable()
export class EmailService implements IEmailService {
    private readonly logger = new Logger(EmailService.name);

    private readonly fromEmail: string;
    private readonly supportEmail: string;

    private readonly appName: string;

    private readonly clientUrl: string;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.fromEmail = this.configService.get<string>('email.fromEmail');
        this.supportEmail =
            this.configService.get<string>('email.supportEmail');

        this.appName = this.configService.get<string>('email.name');

        this.clientUrl = this.configService.get<string>('email.clientUrl');
    }

    async importChangePassword(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
                subject: `Change Password`,
                htmlBody: readFileSync(
                    '/templates/email/change-password.template.html',
                    'utf8'
                ),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async getChangePassword(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
        });
    }

    async deleteChangePassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async sendChangePassword({ name, email }: EmailSendDto): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    appName: this.appName,
                    name: title(name),
                    supportEmail: this.supportEmail,
                    clientUrl: this.clientUrl,
                },
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async importWelcome(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.WELCOME,
                subject: `Welcome`,
                htmlBody: readFileSync(
                    '/templates/email/welcome.template.html',
                    'utf8'
                ),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async getWelcome(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.WELCOME,
        });
    }

    async deleteWelcome(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.WELCOME,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async sendWelcome({ name, email }: EmailSendDto): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_SEND_EMAIL_PROCESS.WELCOME,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    appName: this.appName,
                    name: title(name),
                    email: title(email),
                    supportEmail: this.supportEmail,
                    clientUrl: this.clientUrl,
                },
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async importCreate(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.CREATE,
                subject: `Create`,
                htmlBody: readFileSync(
                    '/templates/email/create.template.html',
                    'utf8'
                ),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async getCreate(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.CREATE,
        });
    }

    async deleteCreate(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.CREATE,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async sendCreate(
        { name, email }: EmailSendDto,
        { password: passwordString, passwordExpiredAt }: EmailTempPasswordDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_SEND_EMAIL_PROCESS.WELCOME,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    appName: this.appName,
                    name: title(name),
                    email: title(email),
                    supportEmail: this.supportEmail,
                    clientUrl: this.clientUrl,
                    password: passwordString,
                    passwordExpiredAt:
                        this.helperDateService.formatToRFC2822(
                            passwordExpiredAt
                        ),
                },
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async importTempPassword(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD,
                subject: `Temporary Password`,
                htmlBody: readFileSync(
                    '/templates/email/temp-password.template.html',
                    'utf8'
                ),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async getTempPassword(): Promise<GetTemplateCommandOutput> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD,
            });

            return template;
        } catch (err: unknown) {
            this.logger.error(err);

            return;
        }
    }

    async deleteTempPassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async sendTempPassword(
        { name, email }: EmailSendDto,
        { password: passwordString, passwordExpiredAt }: EmailTempPasswordDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    appName: this.appName,
                    name: title(name),
                    password: passwordString,
                    supportEmail: this.supportEmail,
                    clientUrl: this.clientUrl,
                    passwordExpiredAt:
                        this.helperDateService.formatToRFC2822(
                            passwordExpiredAt
                        ),
                },
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async importResetPassword(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD,
                subject: `Reset Password`,
                htmlBody: readFileSync(
                    '/templates/email/reset-password.template.html',
                    'utf8'
                ),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async getResetPassword(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD,
        });
    }

    async deleteResetPassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async sendResetPassword(
        { name, email }: EmailSendDto,
        { expiredDate, url }: EmailResetPasswordDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    appName: this.appName,
                    name: title(name),
                    supportEmail: this.supportEmail,
                    clientUrl: this.clientUrl,
                    url: url,
                    expiredDate:
                        this.helperDateService.formatToIsoDate(expiredDate),
                },
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }
}
