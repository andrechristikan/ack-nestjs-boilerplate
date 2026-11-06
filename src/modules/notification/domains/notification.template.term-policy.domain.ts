import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationTemplateEmail,
    INotificationTemplateTermPolicyProcess,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class NotificationTemplateTermPolicyDomain {
    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly notificationUtil: NotificationUtil
    ) {}

    private getTemplateEmail(
        process: INotificationTemplateTermPolicyProcess
    ): INotificationTemplateEmail {
        const templateDir = join(import.meta.dirname, '../templates');

        switch (process) {
            case EnumNotificationProcess.publishTermPolicy:
                return {
                    subject: `Publish Term Policy`,
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.publish-term-policy.template.hbs'
                        ),
                        'utf8'
                    ),
                };
        }
    }

    async emailImport(
        process: INotificationTemplateTermPolicyProcess
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
        process: INotificationTemplateTermPolicyProcess
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
        process: INotificationTemplateTermPolicyProcess
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
