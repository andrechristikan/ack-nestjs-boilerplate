import { Injectable, Logger } from '@nestjs/common';
import { EnumSendEmailProcess } from '@modules/email/enums/email.enum';
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
                name: EnumSendEmailProcess.changePassword,
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
                name: EnumSendEmailProcess.changePassword,
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
                name: EnumSendEmailProcess.changePassword,
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
                name: EnumSendEmailProcess.welcome,
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
                name: EnumSendEmailProcess.welcome,
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
                name: EnumSendEmailProcess.welcome,
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
                name: EnumSendEmailProcess.createByAdmin,
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
                name: EnumSendEmailProcess.createByAdmin,
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
                name: EnumSendEmailProcess.createByAdmin,
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
                name: EnumSendEmailProcess.temporaryPassword,
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
                name: EnumSendEmailProcess.temporaryPassword,
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
                name: EnumSendEmailProcess.temporaryPassword,
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
                name: EnumSendEmailProcess.forgotPassword,
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
                name: EnumSendEmailProcess.forgotPassword,
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
                name: EnumSendEmailProcess.forgotPassword,
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
                name: EnumSendEmailProcess.verification,
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
                name: EnumSendEmailProcess.verification,
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
                name: EnumSendEmailProcess.verification,
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
                name: EnumSendEmailProcess.emailVerified,
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
                name: EnumSendEmailProcess.emailVerified,
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
                name: EnumSendEmailProcess.emailVerified,
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
                name: EnumSendEmailProcess.mobileNumberVerified,
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
                name: EnumSendEmailProcess.mobileNumberVerified,
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
                name: EnumSendEmailProcess.mobileNumberVerified,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Import reset two factor by admin email template to AWS SES
     * @returns {Promise<boolean>} True if template imported successfully, false otherwise
     */
    async importResetTwoFactorByAdmin(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'email.reset-two-factor-by-admin.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumSendEmailProcess.resetTwoFactorByAdmin,
                subject: `Reset Two Factor By Admin`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Get reset two factor by admin email template from AWS SES
     * @returns {Promise<GetTemplateCommandOutput | null>} Template output if found, null otherwise
     */
    async getResetTwoFactorByAdmin(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumSendEmailProcess.resetTwoFactorByAdmin,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    /**
     * Delete reset two factor by admin email template from AWS SES
     * @returns {Promise<boolean>} True if template deleted successfully, false otherwise
     */
    async deleteResetTwoFactorByAdmin(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumSendEmailProcess.resetTwoFactorByAdmin,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }
}
