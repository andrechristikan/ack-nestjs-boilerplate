import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import {
    EnumNotificationPushProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type { INotificationPushSendPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationPushDeliveryService } from '@modules/notification/services/notification.push.delivery.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationPushProcessSendUseCase implements IAppUseCase<
    [string, INotificationPushSendPayload],
    IQueueResponse
> {
    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly notificationPushDeliveryService: NotificationPushDeliveryService,
        private readonly notificationService: NotificationService,
        private readonly notificationUtil: NotificationUtil,
        private readonly outboxService: OutboxService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        outboxId: string,
        {
            kind,
            notificationId,
            userId,
            username,
            encryptedTokens,
            context,
            completedSteps,
            encryptedPendingTokens,
            encryptedFailureTokens,
        }: INotificationPushSendPayload
    ): Promise<IQueueResponse> {
        const process = EnumNotificationPushProcess.send;
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            const message = this.messageService.setMessage(
                'notification.queue.push.error.firebaseNotInitialized',
                { properties: { process } }
            );

            return { message };
        }

        const done = [...completedSteps];
        let failureTokens = encryptedFailureTokens;
        let pendingTokens = encryptedPendingTokens;
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            // Sequential by design: write must not run if an earlier step throws
            await this.notificationPushDeliveryService.stampProcessed(
                notificationId,
                process
            );
            done.push(EnumNotificationStep.updateProcessAt);
        }

        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const { title, body } = NotificationKindContract[kind];
            const metadata = this.notificationUtil.toMetadata(
                kind,
                context,
                username
            );
            const properties = this.notificationUtil.toDisplayProperties(
                kind,
                metadata
            );
            const titleText = this.messageService.setMessage(title);
            const bodyText = this.messageService.setMessage(body, {
                properties,
            });
            const sent =
                await this.notificationPushDeliveryService.sendMulticast(
                    userId,
                    encryptedTokens,
                    { title: titleText, body: bodyText },
                    failureTokens,
                    pendingTokens
                );
            failureTokens = sent.encryptedFailureTokens;
            pendingTokens = sent.encryptedPendingTokens;
            if (sent.failure !== null) {
                await this.outboxService.updateData(outboxId, {
                    completedSteps: done,
                    encryptedPendingTokens: pendingTokens,
                    encryptedFailureTokens: failureTokens,
                });
                const summary = this.notificationUtil.toStepSummary([
                    sent.failure,
                ]);

                throw new QueueException(summary, true, sent.failure.rawError);
            }

            done.push(EnumNotificationStep.sendMulticast);
            await this.outboxService.updateData(outboxId, {
                completedSteps: done,
                encryptedPendingTokens: pendingTokens,
                encryptedFailureTokens: failureTokens,
            });
        }

        if (!done.includes(EnumNotificationStep.updateSentAt)) {
            const tokens = failureTokens ?? [];
            const plainTokens = this.notificationService.decryptFailureTokens(
                userId,
                tokens
            );
            await this.outboxService.withTransaction(async tx => {
                await this.notificationPushDeliveryService.stampSentInTx(
                    tx,
                    notificationId,
                    plainTokens,
                    process
                );
                if (tokens.length > 0) {
                    const effect = this.notificationService.cleanupTokensEffect(
                        userId,
                        tokens
                    );
                    await this.outboxService.addInTx(tx, effect);
                }
            });
            done.push(EnumNotificationStep.updateSentAt);
        }

        await this.outboxService.updateData(outboxId, {
            completedSteps: done,
            encryptedPendingTokens: pendingTokens,
            encryptedFailureTokens: failureTokens,
        });

        const message = this.messageService.setMessage(
            'notification.queue.push.send',
            { properties: { process: kind } }
        );

        return { message };
    }
}
