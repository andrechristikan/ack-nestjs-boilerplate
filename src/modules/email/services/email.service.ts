import { Injectable, Logger } from '@nestjs/common';
import { ENUM_EMAIL } from 'src/modules/email/enums/email.enum';
import { title } from 'case';
import { ConfigService } from '@nestjs/config';
import { IEmailService } from 'src/modules/email/interfaces/email.service.interface';
import { readFileSync } from 'fs';
import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { EmailTempPasswordDto } from 'src/modules/email/dtos/email.temp-password.dto';
import { EmailWelcomeAdminDto } from 'src/modules/email/dtos/email.welcome-admin.dto';
import { ENUM_HELPER_DATE_FORMAT } from 'src/common/helper/enums/helper.enum';
import { AwsSESService } from 'src/modules/aws/services/aws.ses.service';

@Injectable()
export class EmailService implements IEmailService {
    private readonly debug: boolean;
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
        this.debug = this.configService.get<boolean>('app.debug');

        this.fromEmail = this.configService.get<string>('email.fromEmail');
        this.supportEmail =
            this.configService.get<string>('email.supportEmail');

        this.appName = this.configService.get<string>('app.name');

        this.clientUrl = this.configService.get<string>('email.clientUrl');
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
            if (this.debug) {
                this.logger.error(err);
            }

            return false;
        }
    }

    async getChangePassword(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_EMAIL.CHANGE_PASSWORD,
        });
    }

    async deleteChangePassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_EMAIL.CHANGE_PASSWORD,
            });

            return true;
        } catch (err: unknown) {
            if (this.debug) {
                this.logger.error(err);
            }

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
                    appName: this.appName,
                    name: title(name),
                    supportEmail: this.supportEmail,
                    clientUrl: this.clientUrl,
                },
            });

            return true;
        } catch (err: unknown) {
            if (this.debug) {
                this.logger.error(err);
            }

            return false;
        }
    }

    async createWelcome(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_EMAIL.WELCOME,
                subject: `Welcome`,
                htmlBody: readFileSync(
                    './templates/email.welcome.template.html',
                    'utf8'
                ),
            });

            return true;
        } catch (err: unknown) {
            if (this.debug) {
                this.logger.error(err);
            }

            return false;
        }
    }

    async getWelcome(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_EMAIL.WELCOME,
        });
    }

    async deleteWelcome(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_EMAIL.WELCOME,
            });

            return true;
        } catch (err: unknown) {
            if (this.debug) {
                this.logger.error(err);
            }

            return false;
        }
    }

    async sendWelcome({ name, email }: EmailSendDto): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_EMAIL.WELCOME,
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
            if (this.debug) {
                this.logger.error(err);
            }

            return false;
        }
    }

    async createWelcomeAdmin(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_EMAIL.WELCOME_ADMIN,
                subject: `Welcome`,
                htmlBody: readFileSync(
                    './templates/email.welcome-admin.template.html',
                    'utf8'
                ),
            });

            return true;
        } catch (err: unknown) {
            if (this.debug) {
                this.logger.error(err);
            }

            return false;
        }
    }

    async getWelcomeAdmin(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_EMAIL.WELCOME_ADMIN,
        });
    }

    async deleteWelcomeAdmin(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_EMAIL.WELCOME_ADMIN,
            });

            return true;
        } catch (err: unknown) {
            if (this.debug) {
                this.logger.error(err);
            }

            return false;
        }
    }

    async sendWelcomeAdmin(
        { name, email }: EmailSendDto,
        { password: passwordString, passwordExpiredAt }: EmailWelcomeAdminDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_EMAIL.WELCOME,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    appName: this.appName,
                    name: title(name),
                    email: title(email),
                    password: passwordString,
                    supportEmail: this.supportEmail,
                    clientUrl: this.clientUrl,
                    passwordExpiredAt: this.helperDateService.format(
                        passwordExpiredAt,
                        {
                            format: ENUM_HELPER_DATE_FORMAT.FRIENDLY_DATE_TIME,
                        }
                    ),
                },
            });

            return true;
        } catch (err: unknown) {
            if (this.debug) {
                this.logger.error(err);
            }

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
            if (this.debug) {
                this.logger.error(err);
            }

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
            if (this.debug) {
                this.logger.error(err);
            }

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
            if (this.debug) {
                this.logger.error(err);
            }

            return false;
        }
    }

    async sendTempPassword(
        { name, email }: EmailSendDto,
        { password: passwordString, passwordExpiredAt }: EmailTempPasswordDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_EMAIL.TEMP_PASSWORD,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    appName: this.appName,
                    name: title(name),
                    password: passwordString,
                    supportEmail: this.supportEmail,
                    clientUrl: this.clientUrl,
                    passwordExpiredAt: this.helperDateService.format(
                        passwordExpiredAt,
                        {
                            format: ENUM_HELPER_DATE_FORMAT.FRIENDLY_DATE_TIME,
                        }
                    ),
                },
            });

            return true;
        } catch (err: unknown) {
            if (this.debug) {
                this.logger.error(err);
            }

            return false;
        }
    }
}
