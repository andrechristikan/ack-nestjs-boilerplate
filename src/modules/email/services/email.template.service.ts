import { Injectable, Logger } from '@nestjs/common';
import { ENUM_SEND_EMAIL_PROCESS } from '@modules/email/enums/email.enum';
import { readFileSync } from 'fs';
import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { join } from 'path';
import { IEmailTemplateService } from '@modules/email/interfaces/email.template-service.interface';
import { AwsSESService } from '@common/aws/services/aws.ses.service';

/**
 * Service for managing email templates in AWS SES
 * Handles creation, retrieval, and deletion of email templates
 */
@Injectable()
export class EmailTemplateService implements IEmailTemplateService {
    private readonly logger = new Logger(EmailTemplateService.name);

    constructor(private readonly awsSESService: AwsSESService) {}

    /**
     * Import change password email template to AWS SES
     * @returns {Promise<boolean>} True if template imported successfully, false otherwise
     */
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

    /**
     * Get change password email template from AWS SES
     * @returns {Promise<GetTemplateCommandOutput>} Template data from AWS SES
     */
    async getChangePassword(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
        });
    }

    /**
     * Delete change password email template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
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

    /**
     * Import welcome email template to AWS SES
     * @returns {Promise<boolean>} True if template imported successfully, false otherwise
     */
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

    /**
     * Get welcome email template from AWS SES
     * @returns {Promise<GetTemplateCommandOutput>} Template data from AWS SES
     */
    async getWelcome(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.WELCOME,
        });
    }

    /**
     * Delete welcome email template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
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

    /**
     * Import create by admin email template to AWS SES
     * @returns {Promise<boolean>} True if template imported successfully, false otherwise
     */
    async importCreateByAdmin(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/modules/email/templates/create-by-admin.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.CREATE_BY_ADMIN,
                subject: `Created By Admin`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Get create by admin email template from AWS SES
     * @returns {Promise<GetTemplateCommandOutput>} Template data from AWS SES
     */
    async getCreateByAdmin(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.CREATE_BY_ADMIN,
        });
    }

    /**
     * Delete create by admin email template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
    async deleteCreateByAdmin(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.CREATE_BY_ADMIN,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Import temporary password email template to AWS SES
     * @returns {Promise<boolean>} True if template imported successfully, false otherwise
     */
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

    /**
     * Get temporary password email template from AWS SES
     * @returns {Promise<GetTemplateCommandOutput>} Template data from AWS SES
     */
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

    /**
     * Delete temporary password email template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
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

    /**
     * Import forgot password email template to AWS SES
     * @returns {Promise<boolean>} True if template imported successfully, false otherwise
     */
    async importForgotPassword(): Promise<boolean> {
        try {
            const templatePath = join(
                process.cwd(),
                'src/modules/email/templates/forgot-password.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.FORGOT_PASSWORD,
                subject: `Forgot Password`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Get forgot password email template from AWS SES
     * @returns {Promise<GetTemplateCommandOutput>} Template data from AWS SES
     */
    async getForgotPassword(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.FORGOT_PASSWORD,
        });
    }

    /**
     * Delete forgot password email template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
    async deleteForgotPassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.FORGOT_PASSWORD,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Import email verification template to AWS SES
     * @returns {Promise<boolean>} True if template imported successfully, false otherwise
     */
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

    /**
     * Get email verification template from AWS SES
     * @returns {Promise<GetTemplateCommandOutput>} Template data from AWS SES
     */
    async getVerification(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
        });
    }

    /**
     * Delete email verification template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
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

    /**
     * Import email verified confirmation template to AWS SES
     * @returns {Promise<boolean>} True if template imported successfully, false otherwise
     */
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

    /**
     * Get email verified confirmation template from AWS SES
     * @returns {Promise<GetTemplateCommandOutput>} Template data from AWS SES
     */
    async getEmailVerified(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED,
        });
    }

    /**
     * Delete email verified confirmation template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
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

    /**
     * Import mobile number verified confirmation template to AWS SES
     * @returns {Promise<boolean>} True if template imported successfully, false otherwise
     */
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

    /**
     * Get mobile number verified confirmation template from AWS SES
     * @returns {Promise<GetTemplateCommandOutput>} Template data from AWS SES
     */
    async getMobileNumberVerified(): Promise<GetTemplateCommandOutput> {
        return this.awsSESService.getTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.MOBILE_NUMBER_VERIFIED,
        });
    }

    /**
     * Delete mobile number verified confirmation template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
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
