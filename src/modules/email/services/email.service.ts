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
import { EmailCreateDto } from 'src/modules/email/dtos/email.create.dto';
import { EmailVerificationDto } from 'src/modules/email/dtos/email.verification.dto';
import { EmailVerifiedDto } from 'src/modules/email/dtos/email.verified.dto';
import { EmailMobileNumberVerifiedDto } from 'src/modules/email/dtos/email.mobile-number-verified.dto';
import { join } from 'path';

@Injectable()
export class EmailService implements IEmailService {
    private readonly logger = new Logger(EmailService.name);

    private readonly fromEmail: string;
    private readonly supportEmail: string;

    private readonly homeName: string;
    private readonly homeUrl: string;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.fromEmail = this.configService.get<string>('email.fromEmail');
        this.supportEmail =
            this.configService.get<string>('email.supportEmail');

        this.homeName = this.configService.get<string>('home.name');
        this.homeUrl = this.configService.get<string>('home.url');
    }

    async importChangePassword(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/templates/change-password.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
                subject: `Change Password`,
                htmlBody: readFileSync(templatePath, 'utf8'),
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
                    homeName: this.homeName,
                    name: title(name),
                    supportEmail: this.supportEmail,
                    homeUrl: this.homeUrl,
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
            const templatePath = join(
                process.cwd(),
                'src/templates/welcome.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.WELCOME,
                subject: `Welcome`,
                htmlBody: readFileSync(templatePath, 'utf8'),
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
                    homeName: this.homeName,
                    name: title(name),
                    email: title(email),
                    supportEmail: this.supportEmail,
                    homeUrl: this.homeUrl,
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
            const templatePath = join(
                process.cwd(),
                'src/templates/create.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.CREATE,
                subject: `Create`,
                htmlBody: readFileSync(templatePath, 'utf8'),
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
        { password: passwordString, passwordExpiredAt }: EmailCreateDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_SEND_EMAIL_PROCESS.WELCOME,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    homeName: this.homeName,
                    name: title(name),
                    email: title(email),
                    supportEmail: this.supportEmail,
                    homeUrl: this.homeUrl,
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
            const templatePath = join(
                process.cwd(),
                'src/templates/temp-password.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD,
                subject: `Temporary Password`,
                htmlBody: readFileSync(templatePath, 'utf8'),
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
                    homeName: this.homeName,
                    name: title(name),
                    password: passwordString,
                    supportEmail: this.supportEmail,
                    homeUrl: this.homeUrl,
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
            const templatePath = join(
                process.cwd(),
                'src/templates/reset-password.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD,
                subject: `Reset Password`,
                htmlBody: readFileSync(templatePath, 'utf8'),
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
                    homeName: this.homeName,
                    name: title(name),
                    supportEmail: this.supportEmail,
                    homeUrl: this.homeUrl,
                    url: `${this.homeUrl}/${url}`,
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

    async importVerification(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/templates/email-verification.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
                subject: `Email Verification`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async getVerification(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
        });
    }

    async deleteVerification(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async sendVerification(
        { name, email }: EmailSendDto,
        { expiredAt, reference, otp }: EmailVerificationDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    homeName: this.homeName,
                    name: title(name),
                    supportEmail: this.supportEmail,
                    homeUrl: this.homeUrl,
                    expiredAt:
                        this.helperDateService.formatToIsoDate(expiredAt),
                    otp,
                    reference,
                },
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async importEmailVerified(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/templates/email-verified.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED,
                subject: `Email Verified`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async getEmailVerified(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED,
        });
    }

    async deleteEmailVerified(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async sendEmailVerified(
        { name, email }: EmailSendDto,
        { reference }: EmailVerifiedDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    homeName: this.homeName,
                    name: title(name),
                    supportEmail: this.supportEmail,
                    homeUrl: this.homeUrl,
                    reference,
                },
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async importMobileNumberVerified(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/templates/mobile-number-verified.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.MOBILE_NUMBER_VERIFIED,
                subject: `MobileNumber Verified`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async getMobileNumberVerified(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.MOBILE_NUMBER_VERIFIED,
        });
    }

    async deleteMobileNumberVerified(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.MOBILE_NUMBER_VERIFIED,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async sendMobileNumberVerified(
        { name, email }: EmailSendDto,
        { reference, mobileNumber }: EmailMobileNumberVerifiedDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_SEND_EMAIL_PROCESS.MOBILE_NUMBER_VERIFIED,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    homeName: this.homeName,
                    name: title(name),
                    supportEmail: this.supportEmail,
                    homeUrl: this.homeUrl,
                    reference,
                    mobileNumber,
                },
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }
}
