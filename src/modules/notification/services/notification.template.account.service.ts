import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationTemplateAccountProcess,
    INotificationTemplateEmail,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class NotificationTemplateAccountService {
    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly notificationUtil: NotificationUtil
    ) {}

    private getTemplateEmail(
        process: INotificationTemplateAccountProcess
    ): INotificationTemplateEmail {
        const templateDir = join(import.meta.dirname, '../templates');

        switch (process) {
            case EnumNotificationProcess.welcome:
                return {
                    subject: `Welcome`,
                    htmlBody: readFileSync(
                        join(templateDir, 'notification.welcome.template.hbs'),
                        'utf8'
                    ),
                };
            case EnumNotificationProcess.welcomeSocial:
                return {
                    subject: `Welcome Social`,
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.welcome-social.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationProcess.welcomeByAdmin:
                return {
                    subject: `Welcome By Admin`,
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.welcome-by-admin.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationProcess.verificationEmail:
                return {
                    subject: `Email Verification`,
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.verification-email.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationProcess.verifiedEmail:
                return {
                    subject: `Email Verified`,
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.verified-email.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationProcess.verifiedMobileNumber:
                return {
                    subject: `MobileNumber Verified`,
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.verified-mobile-number.template.hbs'
                        ),
                        'utf8'
                    ),
                };
        }
    }

    async emailImport(
        process: INotificationTemplateAccountProcess
    ): Promise<void> {
        try {
            const template = this.getTemplateEmail(process);

            await this.awsSESService.createTemplate({
                name: process,
                subject: template.subject,
                htmlBody: template.htmlBody,
            });
        } catch (err: unknown) {
            const label = this.notificationUtil.toTemplateLabel(process);
            throw new AppUnknownException(
                err,
                `Failed to import ${label} template`
            );
        }
    }

    async emailGet(
        process: INotificationTemplateAccountProcess
    ): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: process,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            const label = this.notificationUtil.toTemplateLabel(process);
            throw new AppUnknownException(
                err,
                `Failed to get ${label} template`
            );
        }
    }

    async emailDelete(
        process: INotificationTemplateAccountProcess
    ): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: process,
            });
        } catch (err: unknown) {
            const label = this.notificationUtil.toTemplateLabel(process);
            throw new AppUnknownException(
                err,
                `Failed to delete ${label} template`
            );
        }
    }
}
