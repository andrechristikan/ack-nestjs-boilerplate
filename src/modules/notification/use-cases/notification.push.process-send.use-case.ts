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
import { DeviceService } from '@modules/device/services/device.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { DatabaseService } from '@common/database/services/database.service';
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
        private readonly deviceService: DeviceService,
        private readonly notificationUtil: NotificationUtil,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        outboxId: string,
        payload: INotificationPushSendPayload
    ): Promise<IQueueResponse> {
        const {
            kind,
            notificationId,
            userId,
            username,
            encryptedTokens,
            context,
            completedSteps,
            encryptedPendingTokens,
            encryptedFailureTokens,
        } = payload;
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
        let data = payload;
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            // Sequential by design: side effects whose order is part of the contract (processedAt before the send, the step recorded after its success, sentAt last)
            await this.notificationPushDeliveryService.stampProcessed(
                notificationId,
                process,
                context.proceedBy
            );
            done.push(EnumNotificationStep.updateProcessAt);
        }

        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const { title, body } = NotificationKindContract[kind];
            const opened = this.notificationUtil.openContext(
                kind,
                context,
                userId
            );
            const metadata = this.notificationUtil.toMetadata(
                kind,
                opened,
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
            data = {
                ...data,
                completedSteps: done,
                encryptedPendingTokens: pendingTokens,
                encryptedFailureTokens: failureTokens,
            };
            if (sent.failure !== null) {
                await this.outboxService.replaceData(outboxId, data);
                const summary =
                    this.notificationPushDeliveryService.toStepSummary([
                        sent.failure,
                    ]);

                throw new QueueException(summary, true, sent.failure.rawError);
            }

            done.push(EnumNotificationStep.sendMulticast);
            await this.outboxService.replaceData(outboxId, data);
        }

        if (!done.includes(EnumNotificationStep.updateSentAt)) {
            const tokens = failureTokens ?? [];
            const plainTokens = this.notificationService.decryptFailureTokens(
                userId,
                tokens
            );
            done.push(EnumNotificationStep.updateSentAt);
            data = { ...data, completedSteps: done };
            await this.databaseService.withTransaction(async tx => {
                await this.notificationPushDeliveryService.stampSentInTx(
                    tx,
                    notificationId,
                    plainTokens,
                    process,
                    context.proceedBy
                );
                const writes = [
                    this.outboxService.replaceDataInTx(tx, outboxId, data),
                ];
                if (tokens.length > 0) {
                    const cleanup =
                        this.deviceService.cleanupNotificationTokensInTx(
                            tx,
                            userId,
                            plainTokens
                        );
                    writes.push(cleanup);
                }
                await Promise.all(writes);
            });
        }

        const message = this.messageService.setMessage(
            'notification.queue.push.send',
            { properties: { process: kind } }
        );

        return { message };
    }
}
