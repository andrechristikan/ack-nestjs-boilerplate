import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { INotificationTemplateSecurityService } from '@modules/notification/interfaces/notification.template.security.service.interface';
import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

/** Manages the SES templates for the password, two-factor and new-device login emails. */
@Injectable()
export class NotificationTemplateSecurityService implements INotificationTemplateSecurityService {
    private readonly logger = new Logger(
        NotificationTemplateSecurityService.name
    );
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
            this.logger.error(err, 'Failed to import change password template');

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
            this.logger.warn(err, 'Failed to get change password template');

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
            this.logger.error(err, 'Failed to delete change password template');

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
            this.logger.error(
                err,
                'Failed to import temporary password by admin template'
            );

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
            this.logger.warn(
                err,
                'Failed to get temporary password by admin template'
            );

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
            this.logger.error(
                err,
                'Failed to delete temporary password by admin template'
            );

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
            this.logger.error(err, 'Failed to import reset password template');

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
            this.logger.warn(err, 'Failed to get reset password template');

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
            this.logger.error(err, 'Failed to delete reset password template');

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
            this.logger.error(err, 'Failed to import forgot password template');

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
            this.logger.warn(err, 'Failed to get forgot password template');

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
            this.logger.error(err, 'Failed to delete forgot password template');

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
            this.logger.error(
                err,
                'Failed to import reset two factor by admin template'
            );

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
            this.logger.warn(
                err,
                'Failed to get reset two factor by admin template'
            );

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
            this.logger.error(
                err,
                'Failed to delete reset two factor by admin template'
            );

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
            this.logger.error(
                err,
                'Failed to import new device login template'
            );

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
            this.logger.warn(err, 'Failed to get new device login template');

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
            this.logger.error(
                err,
                'Failed to delete new device login template'
            );

            return false;
        }
    }
}
