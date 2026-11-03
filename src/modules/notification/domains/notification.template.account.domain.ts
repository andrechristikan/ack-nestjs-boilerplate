import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

/** Manages the SES templates for the sign-up, welcome and verification emails. */
@Injectable()
export class NotificationTemplateAccountDomain {
    constructor(private readonly awsSESService: AwsSESService) {}

    async emailImportWelcome(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.welcome.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.welcome,
                subject: `Welcome`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import welcome template'
            );
        }
    }

    async emailGetWelcome(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.welcome,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get welcome template'
            );
        }
    }

    async emailDeleteWelcome(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.welcome,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete welcome template'
            );
        }
    }

    async emailImportWelcomeSocial(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.welcome-social.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.welcomeSocial,
                subject: `Welcome Social`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import welcome social template'
            );
        }
    }

    async emailGetWelcomeSocial(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.welcomeSocial,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get welcome social template'
            );
        }
    }

    async emailDeleteWelcomeSocial(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.welcomeSocial,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete welcome social template'
            );
        }
    }

    async emailImportWelcomeByAdmin(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.welcome-by-admin.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.welcomeByAdmin,
                subject: `Welcome By Admin`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import welcome by admin template'
            );
        }
    }

    async emailGetWelcomeByAdmin(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.welcomeByAdmin,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get welcome by admin template'
            );
        }
    }

    async emailDeleteWelcomeByAdmin(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.welcomeByAdmin,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete welcome by admin template'
            );
        }
    }

    async emailImportVerificationEmail(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.verification-email.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.verificationEmail,
                subject: `Email Verification`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import verification email template'
            );
        }
    }

    async emailGetVerificationEmail(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.verificationEmail,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get verification email template'
            );
        }
    }

    async emailDeleteVerificationEmail(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.verificationEmail,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete verification email template'
            );
        }
    }

    async emailImportVerifiedEmail(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.verified-email.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.verifiedEmail,
                subject: `Email Verified`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import verified email template'
            );
        }
    }

    async emailGetVerifiedEmail(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.verifiedEmail,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get verified email template'
            );
        }
    }

    async emailDeleteVerifiedEmail(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.verifiedEmail,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete verified email template'
            );
        }
    }

    async emailImportVerifiedMobileNumber(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.verified-mobile-number.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.verifiedMobileNumber,
                subject: `MobileNumber Verified`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import verified mobile number template'
            );
        }
    }

    async emailGetVerifiedMobileNumber(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.verifiedMobileNumber,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get verified mobile number template'
            );
        }
    }

    async emailDeleteVerifiedMobileNumber(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.verifiedMobileNumber,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete verified mobile number template'
            );
        }
    }
}
