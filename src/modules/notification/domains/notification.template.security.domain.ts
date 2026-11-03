import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

/** Manages the SES templates for the password, two-factor and new-device login emails. */
@Injectable()
export class NotificationTemplateSecurityDomain {
    constructor(private readonly awsSESService: AwsSESService) {}

    async emailImportChangePassword(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.change-password.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.changePassword,
                subject: `Change Password`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import change password template'
            );
        }
    }

    async emailGetChangePassword(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.changePassword,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get change password template'
            );
        }
    }

    async emailDeleteChangePassword(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.changePassword,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete change password template'
            );
        }
    }

    async emailImportTemporaryPasswordByAdmin(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.temporary-password-by-admin.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.temporaryPasswordByAdmin,
                subject: `Temporary Password By Admin`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import temporary password by admin template'
            );
        }
    }

    async emailGetTemporaryPasswordByAdmin(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.temporaryPasswordByAdmin,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get temporary password by admin template'
            );
        }
    }

    async emailDeleteTemporaryPasswordByAdmin(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.temporaryPasswordByAdmin,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete temporary password by admin template'
            );
        }
    }

    async emailImportResetPassword(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.reset-password.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.resetPassword,
                subject: `Reset Password`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import reset password template'
            );
        }
    }

    async emailGetResetPassword(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.resetPassword,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get reset password template'
            );
        }
    }

    async emailDeleteResetPassword(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.resetPassword,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete reset password template'
            );
        }
    }

    async emailImportForgotPassword(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.forgot-password.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.forgotPassword,
                subject: `Forgot Password`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import forgot password template'
            );
        }
    }

    async emailGetForgotPassword(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.forgotPassword,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get forgot password template'
            );
        }
    }

    async emailDeleteForgotPassword(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.forgotPassword,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete forgot password template'
            );
        }
    }

    async emailImportResetTwoFactorByAdmin(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.reset-two-factor-by-admin.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.resetTwoFactorByAdmin,
                subject: `Reset Two Factor By Admin`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import reset two factor by admin template'
            );
        }
    }

    async emailGetResetTwoFactorByAdmin(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.resetTwoFactorByAdmin,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get reset two factor by admin template'
            );
        }
    }

    async emailDeleteResetTwoFactorByAdmin(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.resetTwoFactorByAdmin,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete reset two factor by admin template'
            );
        }
    }

    async emailImportNewDeviceLogin(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.new-device-login.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.newDeviceLogin,
                subject: `Device Login`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import new device login template'
            );
        }
    }

    async emailGetNewDeviceLogin(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.newDeviceLogin,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get new device login template'
            );
        }
    }

    async emailDeleteNewDeviceLogin(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.newDeviceLogin,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete new device login template'
            );
        }
    }
}
