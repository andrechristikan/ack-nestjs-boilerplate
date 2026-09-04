import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { INotificationTemplateAccountService } from '@modules/notification/interfaces/notification.template.account.service.interface';
import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

/** Manages the SES templates for the sign-up, welcome and verification emails. */
@Injectable()
export class NotificationTemplateAccountService implements INotificationTemplateAccountService {
    private readonly logger = new Logger(
        NotificationTemplateAccountService.name
    );
    private readonly templatesDir = join(
        process.cwd(),
        'src/modules/notification/templates'
    );

    constructor(private readonly awsSESService: AwsSESService) {}

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
            this.logger.error(err, 'Failed to import welcome template');

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
            this.logger.warn(err, 'Failed to get welcome template');

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
            this.logger.error(err, 'Failed to delete welcome template');

            return false;
        }
    }

    async emailImportWelcomeSocial(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.welcome-social.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.welcomeSocial,
                subject: `Welcome Social`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to import welcome social template');

            return false;
        }
    }

    async emailGetWelcomeSocial(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.welcomeSocial,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err, 'Failed to get welcome social template');

            return null;
        }
    }

    async emailDeleteWelcomeSocial(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.welcomeSocial,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to delete welcome social template');

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
            this.logger.error(
                err,
                'Failed to import welcome by admin template'
            );

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
            this.logger.warn(err, 'Failed to get welcome by admin template');

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
            this.logger.error(
                err,
                'Failed to delete welcome by admin template'
            );

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
            this.logger.error(
                err,
                'Failed to import verification email template'
            );

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
            this.logger.warn(err, 'Failed to get verification email template');

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
            this.logger.error(
                err,
                'Failed to delete verification email template'
            );

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
            this.logger.error(err, 'Failed to import verified email template');

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
            this.logger.warn(err, 'Failed to get verified email template');

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
            this.logger.error(err, 'Failed to delete verified email template');

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
            this.logger.error(
                err,
                'Failed to import verified mobile number template'
            );

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
            this.logger.warn(
                err,
                'Failed to get verified mobile number template'
            );

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
            this.logger.error(
                err,
                'Failed to delete verified mobile number template'
            );

            return false;
        }
    }
}
