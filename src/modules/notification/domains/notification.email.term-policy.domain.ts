import { BulkEmailStatus } from '@aws-sdk/client-ses';
import type { BulkEmailDestinationStatus } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IAwsSESSendBulkRecipient } from '@common/aws/interfaces/aws.ses.interface';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationEmailDeliveryUnknownException } from '@modules/notification/exceptions/notification.email-delivery-unknown.exception';
import type {
    INotificationPublishTermPolicyPayload,
    INotificationTermPolicyBatchRecipientEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
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

    private readonly encryptionSecretKey: string;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly configService: ConfigService,
        private readonly notificationRepository: NotificationRepository,
        private readonly helperDateService: HelperDateService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly databaseUtil: DatabaseUtil
    ) {
        // AppEnvSchema requires both addresses once AWS SES credentials are set, and
        // AwsSESService.send is a no-op while SES is uninitialized, so neither is read as null.
        this.noreplyEmail = this.configService.get<string>('email.noreply')!;
        this.supportEmail = this.configService.get<string>('email.support')!;

        this.homeName = this.configService.get<string>('home.name')!;
        this.homeUrl = this.configService.get<string>('home.url')!;
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;

        this.defaultTemplateData = {
            homeName: this.homeName,
            supportEmail: this.supportEmail,
            homeUrl: this.homeUrl,
        };
    }

    private toBulkDestination({
        userId,
        encryptedEmail,
        username,
    }: INotificationTermPolicyBatchRecipientEncryptedPayload): IAwsSESSendBulkRecipient {
        const recipient = this.helperEncryptionService.aes256Decrypt(
            encryptedEmail,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            userId
        );

        return { recipient, templateData: { username } };
    }

    private async markSent(
        claimNonce: string,
        userIds: string[],
        proceedBy: string
    ): Promise<void> {
        if (userIds.length === 0) {
            return;
        }

        const sentAt = this.helperDateService.create();
        await this.notificationRepository.markTermPolicyRecipientsSent(
            claimNonce,
            userIds,
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
    ): Promise<IQueueResponse> {
        const processed: IQueueResponse = {
            message: 'Publish term policy email processed',
        };

        const isSESInitialized = this.awsSESService.isInitialized();
        if (!isSESInitialized) {
            return processed;
        }

        const destinations = new Map(
            batchRecipients.map(recipient => [
                recipient.userId,
                this.toBulkDestination(recipient),
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
            throw new NotificationEmailDeliveryUnknownException(
                batchId,
                claimedUserIds.length,
                err
            );
        }

        if (statuses.length !== claimedUserIds.length) {
            throw new NotificationEmailDeliveryUnknownException(
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

        const [markOutcome, releaseOutcome] = await Promise.allSettled([
            this.markSent(claimNonce, sentUserIds, proceedBy),
            this.releaseFailed(claimNonce, failedUserIds, proceedBy),
        ]);
        if (markOutcome.status === 'rejected') {
            throw new AppUnknownException(markOutcome.reason);
        }
        if (releaseOutcome.status === 'rejected') {
            throw new AppUnknownException(releaseOutcome.reason);
        }

        if (failedUserIds.length > 0) {
            throw new QueueException(
                `Term policy email batch ${batchId} failed for ${failedUserIds.length} of ${claimedUserIds.length} recipients`,
                true
            );
        }

        if (unknownCount > 0) {
            throw new NotificationEmailDeliveryUnknownException(
                batchId,
                unknownCount
            );
        }

        return processed;
    }
}
