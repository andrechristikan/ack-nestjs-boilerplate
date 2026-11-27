import { BulkEmailStatus } from '@aws-sdk/client-ses';
import type {
    BulkEmailDestinationStatus,
    SendTemplatedEmailCommandOutput,
} from '@aws-sdk/client-ses';
import type { IAwsSesSendBulkRecipient } from '@common/aws/interfaces/aws.ses.interface';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationEmailDeliveryUnknownException } from '@modules/notification/exceptions/notification.email-delivery-unknown.exception';
import type {
    INotificationEmailBulkOutcome,
    INotificationTermPolicyBatchRecipientEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import type { ITermPolicyPublishPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationEmailDeliveryService {
    private readonly noReplyAddress: string;
    private readonly defaultTemplateData: Record<string, string>;

    constructor(
        private readonly awsSesService: AwsSesService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUtil: NotificationUtil,
        private readonly messageService: MessageService
    ) {
        this.noReplyAddress = this.configService.get<string>(
            'email.noReplyAddress'
        )!;
        const name = this.configService.get<string>('frontend.name')!;
        const supportAddress = this.configService.get<string>(
            'email.supportAddress'
        )!;
        const baseUrl = this.configService.get<string>('frontend.baseUrl')!;
        this.defaultTemplateData = {
            homeName: name,
            supportEmail: supportAddress,
            homeUrl: baseUrl,
        };
    }

    private toBulkDestination({
        userId,
        encryptedEmail,
        username,
    }: INotificationTermPolicyBatchRecipientEncryptedPayload): IAwsSesSendBulkRecipient {
        const recipient = this.notificationUtil.decryptPayload(
            encryptedEmail,
            userId
        );

        return { recipient, templateData: { username } };
    }

    private toDeliveryUnknownMessage(
        batchId: string,
        unknownCount: number
    ): string {
        return this.messageService.setMessage(
            'notification.queue.email.error.deliveryUnknown',
            { properties: { batchId, unknownCount } }
        );
    }

    async stampProcessed(
        notificationId: string,
        proceedBy: string
    ): Promise<void> {
        const processedAt = this.helperDateService.now();
        await this.notificationRepository.updateDeliveryProcessedAt(
            notificationId,
            EnumNotificationChannel.email,
            processedAt,
            proceedBy
        );
    }

    async stampSent(notificationId: string, proceedBy: string): Promise<void> {
        const sentAt = this.helperDateService.now();
        await this.notificationRepository.updateDeliverySentAt(
            notificationId,
            EnumNotificationChannel.email,
            sentAt,
            0,
            proceedBy
        );
    }

    /** Sends the SES template named by the kind from the noreply address, the home and support values merged under the template data. */
    async send(
        kind: EnumNotificationKind,
        email: string,
        templateData: Record<string, string>
    ): Promise<SendTemplatedEmailCommandOutput> {
        return this.awsSesService.send({
            templateName: kind,
            recipients: [email],
            sender: this.noReplyAddress,
            templateData: { ...this.defaultTemplateData, ...templateData },
        });
    }

    /** Sends one bulk email to the recipients and sorts their statuses into sent, failed, and unknown; a thrown send or a status count that differs from the recipient count throws the unknown-delivery exception. */
    async sendPublishTermPolicy(
        { type, version }: ITermPolicyPublishPayload,
        batchId: string,
        recipients: INotificationTermPolicyBatchRecipientEncryptedPayload[]
    ): Promise<INotificationEmailBulkOutcome> {
        const destinations = recipients.map(recipient =>
            this.toBulkDestination(recipient)
        );

        let statuses: BulkEmailDestinationStatus[];
        try {
            const result = await this.awsSesService.sendBulk({
                templateName: EnumNotificationKind.publishTermPolicy,
                recipients: destinations,
                sender: this.noReplyAddress,
                defaultTemplateData: {
                    ...this.defaultTemplateData,
                    type,
                    version: String(version),
                },
            });
            statuses = result.Status ?? [];
        } catch (err: unknown) {
            const message = this.toDeliveryUnknownMessage(
                batchId,
                recipients.length
            );

            throw new NotificationEmailDeliveryUnknownException(
                message,
                err,
                batchId,
                recipients.length
            );
        }

        if (statuses.length !== recipients.length) {
            const message = this.toDeliveryUnknownMessage(
                batchId,
                recipients.length
            );

            throw new NotificationEmailDeliveryUnknownException(
                message,
                null,
                batchId,
                recipients.length
            );
        }

        const sentUserIds: string[] = [];
        const failedUserIds: string[] = [];
        let unknownCount = 0;
        for (const [index, { userId }] of recipients.entries()) {
            const status = statuses[index]?.Status ?? null;
            if (status === null) {
                unknownCount += 1;
            } else if (status === BulkEmailStatus.Success) {
                sentUserIds.push(userId);
            } else {
                failedUserIds.push(userId);
            }
        }

        return { sentUserIds, failedUserIds, unknownCount };
    }

    /** Throws for the first failure in this order: a rejected mark, a rejected release, a failed recipient, an unknown status. */
    assertSettled(
        batchId: string,
        claimedCount: number,
        {
            sentUserIds,
            failedUserIds,
            unknownCount,
        }: INotificationEmailBulkOutcome,
        markOutcome: PromiseSettledResult<void>,
        releaseOutcome: PromiseSettledResult<void>
    ): void {
        if (markOutcome.status === 'rejected') {
            const message = this.toDeliveryUnknownMessage(
                batchId,
                sentUserIds.length
            );

            throw new NotificationEmailDeliveryUnknownException(
                message,
                markOutcome.reason,
                batchId,
                sentUserIds.length
            );
        }
        if (releaseOutcome.status === 'rejected') {
            const message = this.toDeliveryUnknownMessage(
                batchId,
                failedUserIds.length
            );

            throw new NotificationEmailDeliveryUnknownException(
                message,
                releaseOutcome.reason,
                batchId,
                failedUserIds.length
            );
        }

        if (failedUserIds.length > 0) {
            const message = this.messageService.setMessage(
                'notification.queue.email.error.batchFailed',
                {
                    properties: {
                        batchId,
                        failedCount: failedUserIds.length,
                        claimedCount,
                    },
                }
            );

            throw new QueueException(message, true);
        }

        if (unknownCount > 0) {
            const message = this.toDeliveryUnknownMessage(
                batchId,
                unknownCount
            );

            throw new NotificationEmailDeliveryUnknownException(
                message,
                null,
                batchId,
                unknownCount
            );
        }
    }
}
