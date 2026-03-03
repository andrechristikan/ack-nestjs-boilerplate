import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { join } from 'path';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { INotificationTemplateService } from '@modules/notification/interfaces/notification.template.interface';

@Injectable()
export class NotificationTemplateService implements INotificationTemplateService {
    private readonly logger = new Logger(NotificationTemplateService.name);
    private readonly templatesDir = join(
        process.cwd(),
        'src/modules/notification/templates'
    );

    constructor(private readonly awsSESService: AwsSESService) {}

    async emailImportChangePassword(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.change-password.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.changePassword,
                subject: `Change Password`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailGetChangePassword(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.changePassword,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    async emailDeleteChangePassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.changePassword,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailImportWelcome(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.welcome.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.welcome,
                subject: `Welcome`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailGetWelcome(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.welcome,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    async emailDeleteWelcome(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.welcome,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailImportWelcomeByAdmin(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.welcome-by-admin.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.welcomeByAdmin,
                subject: `Welcome By Admin`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailGetWelcomeByAdmin(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.welcomeByAdmin,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    async emailDeleteWelcomeByAdmin(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.welcomeByAdmin,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailImportTemporaryPasswordByAdmin(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.temporary-password-by-admin.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.temporaryPasswordByAdmin,
                subject: `Temporary Password By Admin`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailGetTemporaryPasswordByAdmin(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.temporaryPasswordByAdmin,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    async emailDeleteTemporaryPasswordByAdmin(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.temporaryPasswordByAdmin,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailImportResetPassword(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.reset-password.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.resetPassword,
                subject: `Reset Password`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailGetResetPassword(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.resetPassword,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    async emailDeleteResetPassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.resetPassword,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailImportForgotPassword(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.forgot-password.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.forgotPassword,
                subject: `Forgot Password`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailGetForgotPassword(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.forgotPassword,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    async emailDeleteForgotPassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.forgotPassword,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailImportVerificationEmail(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.verification-email.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.verificationEmail,
                subject: `Email Verification`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailGetVerificationEmail(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.verificationEmail,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    async emailDeleteVerificationEmail(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.verificationEmail,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailImportVerifiedEmail(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.verified-email.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.verifiedEmail,
                subject: `Email Verified`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailGetVerifiedEmail(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.verifiedEmail,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    async emailDeleteVerifiedEmail(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.verifiedEmail,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailImportVerifiedMobileNumber(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.verified-mobile-number.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.verifiedMobileNumber,
                subject: `MobileNumber Verified`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailGetVerifiedMobileNumber(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.verifiedMobileNumber,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    async emailDeleteVerifiedMobileNumber(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.verifiedMobileNumber,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailImportResetTwoFactorByAdmin(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.reset-two-factor-by-admin.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.resetTwoFactorByAdmin,
                subject: `Reset Two Factor By Admin`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailGetResetTwoFactorByAdmin(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.resetTwoFactorByAdmin,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    async emailDeleteResetTwoFactorByAdmin(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.resetTwoFactorByAdmin,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailImportNewDeviceLogin(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.new-device-login.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.newDeviceLogin,
                subject: `Device Login`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailGetNewDeviceLogin(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.newDeviceLogin,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    async emailDeleteNewDeviceLogin(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.newDeviceLogin,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailImportPublishTermPolicy(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.publish-term-policy.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.publishTermPolicy,
                subject: `Publish Term Policy`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    async emailGetPublishTermPolicy(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.publishTermPolicy,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err);

            return null;
        }
    }

    async emailDeletePublishTermPolicy(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.publishTermPolicy,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }
}
