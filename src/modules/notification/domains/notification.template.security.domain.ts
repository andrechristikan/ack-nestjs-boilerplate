import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationTemplateEmail,
    INotificationTemplateSecurityProcess,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class NotificationTemplateSecurityDomain {
    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly notificationUtil: NotificationUtil
    ) {}

    private getTemplateEmail(
        process: INotificationTemplateSecurityProcess
    ): INotificationTemplateEmail {
        const templateDir = join(import.meta.dirname, '../templates');

        switch (process) {
            case EnumNotificationProcess.changePassword:
                return {
                    subject: `Change Password`,
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.change-password.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationProcess.temporaryPasswordByAdmin:
                return {
                    subject: `Temporary Password By Admin`,
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.temporary-password-by-admin.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationProcess.resetPassword:
                return {
                    subject: `Reset Password`,
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.reset-password.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationProcess.forgotPassword:
                return {
                    subject: `Forgot Password`,
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.forgot-password.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationProcess.resetTwoFactorByAdmin:
                return {
                    subject: `Reset Two Factor By Admin`,
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.reset-two-factor-by-admin.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationProcess.newDeviceLogin:
                return {
                    subject: `Device Login`,
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.new-device-login.template.hbs'
                        ),
                        'utf8'
                    ),
                };
        }
    }

    async emailImport(
        process: INotificationTemplateSecurityProcess
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
        process: INotificationTemplateSecurityProcess
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
        process: INotificationTemplateSecurityProcess
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
