import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IFirebasePushPayload } from '@common/firebase/interfaces/firebase.interface';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import {
    EnumNotificationPushProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type { INotificationPushSendOutcome } from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { Injectable } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';

@Injectable()
export class NotificationPushDeliveryService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly messageService: MessageService,
        private readonly helperDateService: HelperDateService,
        private readonly firebaseService: FirebaseService,
        private readonly notificationUtil: NotificationUtil
    ) {}

    private throwDeliveryNotFound(process: EnumNotificationPushProcess): never {
        const message = this.messageService.setMessage(
            'notification.queue.push.error.deliveryNotFound',
            { properties: { process } }
        );

        throw new UnrecoverableError(message);
    }

    async stampProcessed(
        notificationId: string,
        process: EnumNotificationPushProcess
    ): Promise<void> {
        const processedAt = this.helperDateService.create();
        const stamped =
            await this.notificationRepository.updateDeliveryProcessedAt(
                notificationId,
                EnumNotificationChannel.push,
                processedAt
            );
        if (!stamped) {
            this.throwDeliveryNotFound(process);
        }
    }

    /** Sends to the pending tokens when any are recorded, else to every token; a rejected send returns the recorded tokens unchanged with the failure. */
    async sendMulticast(
        userId: string,
        encryptedTokens: string[],
        payload: IFirebasePushPayload,
        encryptedFailureTokens: string[] | null,
        encryptedPendingTokens: string[] | null
    ): Promise<INotificationPushSendOutcome> {
        const pairs = this.notificationUtil.toTokenPairs(
            userId,
            encryptedPendingTokens ?? encryptedTokens
        );
        try {
            const result = await this.firebaseService.sendMulticast(
                pairs.map(pair => pair.token),
                payload
            );

            return this.notificationUtil.toMulticastOutcome(
                pairs,
                result,
                encryptedFailureTokens
            );
        } catch (error: unknown) {
            const failure = this.notificationUtil.toStepFailure(
                EnumNotificationStep.sendMulticast,
                error
            );

            return { encryptedFailureTokens, encryptedPendingTokens, failure };
        }
    }

    async stampSentInTx(
        tx: IDatabaseTransactionClient,
        notificationId: string,
        failureTokens: string[],
        process: EnumNotificationPushProcess
    ): Promise<void> {
        const sentAt = this.helperDateService.create();
        const stamped =
            await this.notificationRepository.updateDeliverySentAtInTx(
                tx,
                notificationId,
                EnumNotificationChannel.push,
                sentAt,
                failureTokens
            );
        if (!stamped) {
            this.throwDeliveryNotFound(process);
        }
    }
}
