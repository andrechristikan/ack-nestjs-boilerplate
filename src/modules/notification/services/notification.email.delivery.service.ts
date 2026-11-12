import type { SendTemplatedEmailCommandOutput } from '@aws-sdk/client-ses';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import type { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationEmailDeliveryService {
    private readonly noreplyEmail: string;
    private readonly defaultTemplateData: Record<string, string>;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly notificationRepository: NotificationRepository
    ) {
        this.noreplyEmail = this.configService.get<string>('email.noreply')!;
        const homeName = this.configService.get<string>('home.name')!;
        const supportEmail = this.configService.get<string>('email.support')!;
        const homeUrl = this.configService.get<string>('home.url')!;
        this.defaultTemplateData = { homeName, supportEmail, homeUrl };
    }

    async stampProcessed(notificationId: string): Promise<void> {
        const processedAt = this.helperDateService.create();
        await this.notificationRepository.updateDeliveryProcessedAt(
            notificationId,
            EnumNotificationChannel.email,
            processedAt
        );
    }

    async stampSent(notificationId: string): Promise<void> {
        const sentAt = this.helperDateService.create();
        await this.notificationRepository.updateDeliverySentAt(
            notificationId,
            EnumNotificationChannel.email,
            sentAt,
            []
        );
    }

    /** Sends the SES template named by the kind from the noreply address, the home and support values merged under the template data. */
    async send(
        kind: EnumNotificationKind,
        email: string,
        templateData: Record<string, string>
    ): Promise<SendTemplatedEmailCommandOutput> {
        return this.awsSESService.send({
            templateName: kind,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: { ...this.defaultTemplateData, ...templateData },
        });
    }
}
