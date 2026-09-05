import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { INotificationTemplateTermPolicyService } from '@modules/notification/interfaces/notification.template.term-policy.service.interface';
import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

/** Manages the SES template for the term-policy publication email. */
@Injectable()
export class NotificationTemplateTermPolicyService implements INotificationTemplateTermPolicyService {
    private readonly logger = new Logger(
        NotificationTemplateTermPolicyService.name
    );
    private readonly templatesDir = join(
        process.cwd(),
        'src/modules/notification/templates'
    );

    constructor(private readonly awsSESService: AwsSESService) {}

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
            this.logger.error(
                err,
                'Failed to import publish term policy template'
            );

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
            this.logger.warn(err, 'Failed to get publish term policy template');

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
            this.logger.error(
                err,
                'Failed to delete publish term policy template'
            );

            return false;
        }
    }
}
