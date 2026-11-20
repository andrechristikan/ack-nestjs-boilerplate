import { CacheService } from '@common/cache/services/cache.service';
import { QueueBase } from '@common/queue/bases/queue.base';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import {
    EnumNotificationKind,
    EnumNotificationQueue,
    EnumNotificationSmsProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationRecipientRecord,
    INotificationSealedData,
    INotificationSmsSendEffect,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationSmsQueue extends QueueBase {
    constructor(
        @InjectQueue(EnumNotificationQueue.notificationSms)
        protected readonly queue: Queue,
        protected readonly cacheService: CacheService,
        private readonly notificationUtil: NotificationUtil
    ) {
        super(queue, cacheService);
    }

    sendEffect(
        kind: EnumNotificationKind,
        notificationId: string,
        context: INotificationSealedData,
        { userId, username }: INotificationRecipientRecord,
        encryptedMobileNumber: string
    ): INotificationSmsSendEffect {
        const { queuePriority } = NotificationKindContract[kind];
        const idempotencyKey = this.notificationUtil.toStepKey(
            notificationId,
            EnumNotificationStep.sendSms
        );

        return {
            queue: EnumNotificationQueue.notificationSms,
            name: EnumNotificationSmsProcess.send,
            data: {
                kind,
                notificationId,
                userId,
                username,
                encryptedMobileNumber,
                context,
                completedSteps: [],
            },
            priority: queuePriority,
            idempotencyKey,
        };
    }
}
