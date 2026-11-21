import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { NotificationEmailDeliveryService } from '@modules/notification/services/notification.email.delivery.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import type {
    INotificationEmailBulkOutcome,
    INotificationEmailBulkQueuePayload,
    INotificationEmailPublishTermPolicyResult,
    INotificationTermPolicyBatchRecipientEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { TermPolicyRecipientService } from '@modules/term-policy/services/term-policy.recipient.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { ITermPolicyPublishPayload } from '@modules/term-policy/interfaces/term-policy.interface';

@Injectable()
export class NotificationEmailProcessPublishTermPolicyUseCase implements IAppUseCase<
    [INotificationEmailBulkQueuePayload<ITermPolicyPublishPayload>],
    INotificationEmailPublishTermPolicyResult
> {
    constructor(
        private readonly termPolicyRecipientService: TermPolicyRecipientService,
        private readonly notificationEmailDeliveryService: NotificationEmailDeliveryService,
        private readonly notificationService: NotificationService,
        private readonly awsSESService: AwsSESService,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService
    ) {}

    private async markSent(
        claimNonce: string,
        recipients: INotificationTermPolicyBatchRecipientEncryptedPayload[],
        { sentUserIds }: INotificationEmailBulkOutcome,
        proceedBy: string
    ): Promise<void> {
        if (sentUserIds.length === 0) {
            return;
        }

        const sentUserIdSet = new Set(sentUserIds);
        const sentNotificationIds = recipients
            .filter(({ userId }) => sentUserIdSet.has(userId))
            .map(({ notificationId }) => notificationId);
        const sentAt = this.helperDateService.create();

        await this.databaseService.withTransaction(async tx => {
            await Promise.all([
                this.termPolicyRecipientService.markSentInTx(
                    tx,
                    claimNonce,
                    sentUserIds,
                    sentAt,
                    proceedBy
                ),
                this.notificationService.markEmailSentInTx(
                    tx,
                    sentNotificationIds,
                    sentAt,
                    proceedBy
                ),
            ]);
        });
    }

    async execute({
        data,
        batchId,
        proceedBy,
        recipients,
    }: INotificationEmailBulkQueuePayload<ITermPolicyPublishPayload>): Promise<INotificationEmailPublishTermPolicyResult> {
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

        const claim = await this.termPolicyRecipientService.claim(
            data.termPolicyId,
            batchId,
            recipients.map(({ userId }) => userId),
            proceedBy
        );
        if (claim.userIds.length === 0) {
            return processed;
        }

        const claimedUserIdSet = new Set(claim.userIds);
        const claimedRecipients = recipients.filter(({ userId }) =>
            claimedUserIdSet.has(userId)
        );
        const outcome =
            await this.notificationEmailDeliveryService.sendPublishTermPolicy(
                data,
                batchId,
                claimedRecipients
            );

        const [markOutcome, releaseOutcome] = await Promise.allSettled([
            this.markSent(claim.claimNonce, recipients, outcome, proceedBy),
            this.termPolicyRecipientService.release(
                claim.claimNonce,
                outcome.failedUserIds,
                proceedBy
            ),
        ]);
        this.notificationEmailDeliveryService.assertSettled(
            batchId,
            claim.userIds.length,
            outcome,
            markOutcome,
            releaseOutcome
        );

        return processed;
    }
}
