import { BulkEmailStatus } from '@aws-sdk/client-ses';
import type { BulkEmailDestinationStatus } from '@aws-sdk/client-ses';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationEmailDeliveryUnknownException } from '@modules/notification/exceptions/notification.email-delivery-unknown.exception';
import type {
    INotificationEmailPublishTermPolicyResult,
    INotificationPublishTermPolicyPayload,
    INotificationTermPolicyBatchRecipientEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueException } from '@queues/exceptions/queue.exception';
import { MessageService } from '@common/message/services/message.service';

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
        private readonly helperDateService: HelperDateService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationUtil: NotificationUtil,
        private readonly messageService: MessageService
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

    private async markSent(
        claimNonce: string,
        userIds: string[],
        notificationIds: string[],
        proceedBy: string
    ): Promise<void> {
        if (userIds.length === 0) {
            return;
        }

        const sentAt = this.helperDateService.create();
        await this.notificationRepository.markTermPolicyRecipientsSent(
            claimNonce,
            userIds,
            notificationIds,
            sentAt,
            proceedBy
        );
    }

    private async releaseFailed(
        claimNonce: string,
        userIds: string[],
        proceedBy: string
    ): Promise<void> {
        if (userIds.length === 0) {
            return;
        }

        await this.notificationRepository.releaseTermPolicyRecipients(
            claimNonce,
            userIds,
            proceedBy
        );
    }

    async processPublishTermPolicy(
        { termPolicyId, type, version }: INotificationPublishTermPolicyPayload,
        batchId: string,
        proceedBy: string,
        batchRecipients: INotificationTermPolicyBatchRecipientEncryptedPayload[]
    ): Promise<INotificationEmailPublishTermPolicyResult> {
        const message = this.messageService.setMessage(
            'notification.queue.email.publishTermPolicy'
        );
        const processed: INotificationEmailPublishTermPolicyResult = {
            message,
        };

        const isSESInitialized = this.awsSESService.isInitialized();
        if (!isSESInitialized) {
            return processed;
        }

        const destinations = new Map(
            batchRecipients.map(recipient => [
                recipient.userId,
                this.notificationUtil.toBulkDestination(recipient),
            ])
        );

        const claimNonce = this.databaseUtil.createId();
        const claimedAt = this.helperDateService.create();
        const claimedUserIds =
            await this.notificationRepository.claimTermPolicyRecipients(
                termPolicyId,
                batchId,
                [...destinations.keys()],
                claimNonce,
                claimedAt,
                proceedBy
            );
        if (claimedUserIds.length === 0) {
            return processed;
        }

        let statuses: BulkEmailDestinationStatus[];
        try {
            const result = await this.awsSESService.sendBulk({
                templateName: EnumNotificationProcess.publishTermPolicy,
                recipients: claimedUserIds.map(userId =>
                    destinations.get(userId)!
                ),
                sender: this.noreplyEmail,
                defaultTemplateData: {
                    ...this.defaultTemplateData,
                    type,
                    version: String(version),
                },
            });
            statuses = result.Status ?? [];
        } catch (err: unknown) {
            const message = this.notificationUtil.toDeliveryUnknownMessage(
                batchId,
                claimedUserIds.length
            );

            throw new NotificationEmailDeliveryUnknownException(
                message,
                batchId,
                claimedUserIds.length,
                err
            );
        }

        if (statuses.length !== claimedUserIds.length) {
            const message = this.notificationUtil.toDeliveryUnknownMessage(
                batchId,
                claimedUserIds.length
            );

            throw new NotificationEmailDeliveryUnknownException(
                message,
                batchId,
                claimedUserIds.length
            );
        }

        const sentUserIds: string[] = [];
        const failedUserIds: string[] = [];
        let unknownCount = 0;
        for (const [index, userId] of claimedUserIds.entries()) {
            const status = statuses[index]?.Status ?? null;
            if (status === null) {
                unknownCount += 1;
            } else if (status === BulkEmailStatus.Success) {
                sentUserIds.push(userId);
            } else {
                failedUserIds.push(userId);
            }
        }

        const sentUserIdSet = new Set(sentUserIds);
        const sentNotificationIds = batchRecipients
            .filter(({ userId }) => sentUserIdSet.has(userId))
            .map(({ notificationId }) => notificationId);

        const [markOutcome, releaseOutcome] = await Promise.allSettled([
            this.markSent(
                claimNonce,
                sentUserIds,
                sentNotificationIds,
                proceedBy
            ),
            this.releaseFailed(claimNonce, failedUserIds, proceedBy),
        ]);
        if (markOutcome.status === 'rejected') {
            const message = this.notificationUtil.toDeliveryUnknownMessage(
                batchId,
                sentUserIds.length
            );

            throw new NotificationEmailDeliveryUnknownException(
                message,
                batchId,
                sentUserIds.length,
                markOutcome.reason
            );
        }
        if (releaseOutcome.status === 'rejected') {
            const message = this.notificationUtil.toDeliveryUnknownMessage(
                batchId,
                failedUserIds.length
            );

            throw new NotificationEmailDeliveryUnknownException(
                message,
                batchId,
                failedUserIds.length,
                releaseOutcome.reason
            );
        }

        if (failedUserIds.length > 0) {
            const message = this.messageService.setMessage(
                'notification.queue.email.error.batchFailed',
                {
                    properties: {
                        batchId,
                        failedCount: failedUserIds.length,
                        claimedCount: claimedUserIds.length,
                    },
                }
            );

            throw new QueueException(message, true);
        }

        if (unknownCount > 0) {
            const message = this.notificationUtil.toDeliveryUnknownMessage(
                batchId,
                unknownCount
            );

            throw new NotificationEmailDeliveryUnknownException(
                message,
                batchId,
                unknownCount
            );
        }

        return processed;
    }
}
