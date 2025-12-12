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
    private readonly templatesDir = join(
        process.cwd(),
        'src/modules/email/templates'
    );

    constructor(private readonly awsSESService: AwsSESService) {}

    /**
     * Import change password email template to AWS SES
     * @returns {Promise<boolean>} True if template imported successfully, false otherwise
     */
    async importChangePassword(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'email.change-password.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.changePassword,
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
     * @returns {Promise<GetTemplateCommandOutput | null>} Template data from AWS SES
     */
    async getChangePassword(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.changePassword,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    /**
     * Delete change password email template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
    async deleteChangePassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.changePassword,
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
                this.templatesDir,
                'email.welcome.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.welcome,
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
     * @returns {Promise<GetTemplateCommandOutput | null>} Template data from AWS SES
     */
    async getWelcome(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.welcome,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    /**
     * Delete welcome email template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
    async deleteWelcome(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.welcome,
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
                this.templatesDir,
                'email.create-by-admin.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.createByAdmin,
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
     * @returns {Promise<GetTemplateCommandOutput | null>} Template data from AWS SES
     */
    async getCreateByAdmin(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.createByAdmin,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    /**
     * Delete create by admin email template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
    async deleteCreateByAdmin(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.createByAdmin,
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
                this.templatesDir,
                'email.temp-password.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.temporaryPassword,
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
     * @returns {Promise<GetTemplateCommandOutput | null>} Template data from AWS SES
     */
    async getTempPassword(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.temporaryPassword,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    /**
     * Delete temporary password email template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
    async deleteTempPassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.temporaryPassword,
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
                this.templatesDir,
                'email.forgot-password.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.forgotPassword,
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
     * @returns {Promise<GetTemplateCommandOutput | null>} Template data from AWS SES
     */
    async getForgotPassword(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.forgotPassword,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    /**
     * Delete forgot password email template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
    async deleteForgotPassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.forgotPassword,
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
                this.templatesDir,
                'email.verification.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.verification,
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
     * @returns {Promise<GetTemplateCommandOutput | null>} Template data from AWS SES
     */
    async getVerification(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.verification,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    /**
     * Delete email verification template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
    async deleteVerification(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.verification,
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
                this.templatesDir,
                'email.verified.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.emailVerified,
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
     * @returns {Promise<GetTemplateCommandOutput | null>} Template data from AWS SES
     */
    async getEmailVerified(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.emailVerified,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    /**
     * Delete email verified confirmation template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
    async deleteEmailVerified(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.emailVerified,
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
                this.templatesDir,
                'email.mobile-number-verified.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.mobileNumberVerified,
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
     * @returns {Promise<GetTemplateCommandOutput | null>} Template data from AWS SES
     */
    async getMobileNumberVerified(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.mobileNumberVerified,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    /**
     * Delete mobile number verified confirmation template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
    async deleteMobileNumberVerified(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_SEND_EMAIL_PROCESS.mobileNumberVerified,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }
}
