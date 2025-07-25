import { Injectable, Logger } from '@nestjs/common';
import { ENUM_SEND_EMAIL_PROCESS } from '@modules/email/enums/email.enum';
import { readFileSync } from 'fs';
import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AwsSESService } from '@modules/aws/services/aws.ses.service';
import { join } from 'path';
import { IEmailTemplateService } from '@modules/email/interfaces/email.template-service.interface';

@Injectable()
export class EmailTemplateService implements IEmailTemplateService {
    private readonly logger = new Logger(EmailTemplateService.name);

    constructor(private readonly awsSESService: AwsSESService) {}

    async importChangePassword(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/modules/email/templates/change-password.template.hbs'
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

    async importWelcome(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/modules/email/templates/welcome.template.hbs'
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

    async importCreate(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/modules/email/templates/create.template.hbs'
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

    async importTempPassword(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/modules/email/templates/temp-password.template.hbs'
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

    async importResetPassword(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/modules/email/templates/reset-password.template.hbs'
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

    async importVerification(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/modules/email/templates/email-verification.template.hbs'
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

    async importEmailVerified(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/modules/email/templates/email-verified.template.hbs'
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

    async importMobileNumberVerified(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/modules/email/templates/mobile-number-verified.template.hbs'
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
}
