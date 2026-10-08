import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type { INotificationPublishTermPolicyPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueException } from '@queues/exceptions/queue.exception';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Renders and sends the term-policy publication email to one batch of recipients. */
@Injectable()
export class NotificationEmailTermPolicyDomain {
    private readonly noreplyEmail: string;
    private readonly supportEmail: string;

    private readonly homeName: string;
    private readonly homeUrl: string;

    private readonly defaultTemplateData: Record<string, string>;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly configService: ConfigService,
        private readonly notificationRepository: NotificationRepository,
        private readonly helperDateService: HelperDateService
    ) {
        // AppEnvSchema requires both addresses once AWS SES credentials are set, and
        // AwsSESService.send is a no-op while SES is uninitialized, so neither is read as null.
        this.noreplyEmail = this.configService.get<string>('email.noreply')!;
        this.supportEmail = this.configService.get<string>('email.support')!;

        this.homeName = this.configService.get<string>('home.name')!;
        this.homeUrl = this.configService.get<string>('home.url')!;

        this.defaultTemplateData = {
            homeName: this.homeName,
            supportEmail: this.supportEmail,
            homeUrl: this.homeUrl,
        };
    }

    async processPublishTermPolicy(
        { termPolicyId, type, version }: INotificationPublishTermPolicyPayload,
        batchId: string,
        proceedBy: string
    ): Promise<IQueueResponse> {
        const recipients =
            await this.notificationRepository.findTermPolicyRecipientsUnsent(
                termPolicyId,
                batchId
            );
        if (recipients.length === 0) {
            return { message: 'Publish term policy email processed' };
        }

        const result = await this.awsSESService.sendBulk({
            templateName: EnumNotificationProcess.publishTermPolicy,
            recipients: recipients.map(({ email, username }) => ({
                recipient: email,
                templateData: { username },
            })),
            sender: this.noreplyEmail,
            defaultTemplateData: {
                ...this.defaultTemplateData,
                type,
                version: String(version),
            },
        });

        const statuses = result.Status ?? [];
        if (statuses.length === 0) {
            return { message: 'Publish term policy email processed' };
        }

        const sentUserIds = recipients
            .filter((_, index) => statuses[index]?.Status === 'Success')
            .map(({ userId }) => userId);
        const failed = recipients.length - sentUserIds.length;

        if (sentUserIds.length > 0) {
            const sentAt = this.helperDateService.create();
            await this.notificationRepository.markTermPolicyRecipientsSent(
                termPolicyId,
                batchId,
                sentUserIds,
                sentAt,
                proceedBy
            );
        }

        if (failed > 0 || statuses.length !== recipients.length) {
            throw new QueueException(
                `Term policy email batch ${batchId} failed for ${failed} of ${recipients.length} recipients`,
                true
            );
        }

        return { message: 'Publish term policy email processed' };
    }
}
