import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IFirebasePushPayload,
    IFirebasePushResult,
} from '@common/firebase/interfaces/firebase.interface';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import {
    EnumNotificationPushProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationPushSendOutcome,
    INotificationPushTokenPair,
    INotificationStepFailure,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushDeliveryNotFoundException } from '@modules/notification/exceptions/notification.push-delivery-not-found.exception';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { Injectable } from '@nestjs/common';

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

        throw new NotificationPushDeliveryNotFoundException(message);
    }

    private toEncryptedTokens(
        pairs: INotificationPushTokenPair[],
        tokens: string[]
    ): string[] {
        const wanted = new Set(tokens);

        return pairs
            .filter(pair => wanted.has(pair.token))
            .map(pair => pair.encrypted);
    }

    private toStepFailure(
        step: EnumNotificationStep,
        reason: unknown
    ): INotificationStepFailure {
        const rawError =
            reason instanceof Error ? reason : new Error(String(reason));

        return { step, rawError };
    }

    private toTokenPairs(
        userId: string,
        encryptedTokens: string[]
    ): INotificationPushTokenPair[] {
        return encryptedTokens.map(encrypted => {
            const token = this.notificationUtil.decryptPayload(
                encrypted,
                userId
            );

            return { encrypted, token };
        });
    }

    private toMulticastOutcome(
        pairs: INotificationPushTokenPair[],
        { failureTokens, retryTokens }: IFirebasePushResult,
        encryptedFailureTokens: string[] | null
    ): INotificationPushSendOutcome {
        const failed = this.toEncryptedTokens(pairs, failureTokens);
        const merged = [...(encryptedFailureTokens ?? []), ...failed];
        const pending = this.toEncryptedTokens(pairs, retryTokens);
        let failure: INotificationStepFailure | null = null;
        if (pending.length > 0) {
            const message = this.messageService.setMessage(
                'notification.queue.push.error.tokensPending',
                { properties: { count: pending.length } }
            );
            failure = {
                step: EnumNotificationStep.sendMulticast,
                rawError: new Error(message),
            };
        }

        return {
            encryptedFailureTokens: [...new Set(merged)],
            encryptedPendingTokens: pending,
            failure,
        };
    }

    toStepSummary(failedSteps: INotificationStepFailure[]): string {
        const steps = failedSteps.map(({ step }) => step);

        return this.messageService.setMessage(
            'notification.queue.push.error.stepsFailed',
            { properties: { steps: steps.join(', ') } }
        );
    }

    async stampProcessed(
        notificationId: string,
        process: EnumNotificationPushProcess,
        proceedBy: string
    ): Promise<void> {
        const processedAt = this.helperDateService.now();
        const stamped =
            await this.notificationRepository.updateDeliveryProcessedAt(
                notificationId,
                EnumNotificationChannel.push,
                processedAt,
                proceedBy
            );
        if (!stamped) {
            this.throwDeliveryNotFound(process);
        }
    }

    /** Sends to the recorded pending tokens, or to every token when no pending list is recorded (null); a rejected send returns the recorded tokens unchanged with the failure. */
    async sendMulticast(
        userId: string,
        encryptedTokens: string[],
        payload: IFirebasePushPayload,
        encryptedFailureTokens: string[] | null,
        encryptedPendingTokens: string[] | null
    ): Promise<INotificationPushSendOutcome> {
        const pairs = this.toTokenPairs(
            userId,
            encryptedPendingTokens ?? encryptedTokens
        );
        try {
            const result = await this.firebaseService.sendMulticast(
                pairs.map(pair => pair.token),
                payload
            );

            return this.toMulticastOutcome(
                pairs,
                result,
                encryptedFailureTokens
            );
        } catch (error: unknown) {
            const failure = this.toStepFailure(
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
        process: EnumNotificationPushProcess,
        proceedBy: string
    ): Promise<void> {
        const sentAt = this.helperDateService.now();
        const stamped =
            await this.notificationRepository.updateDeliverySentAtInTx(
                tx,
                notificationId,
                EnumNotificationChannel.push,
                sentAt,
                failureTokens,
                proceedBy
            );
        if (!stamped) {
            this.throwDeliveryNotFound(process);
        }
    }
}
