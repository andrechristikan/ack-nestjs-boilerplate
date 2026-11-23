import {
    EnumNotificationKind,
    EnumNotificationPushProcess,
} from '@modules/notification/enums/notification.enum';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import type {
    INotificationPushSendEffect,
    INotificationRecipientRecord,
    INotificationSealedData,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@common/queue/bases/queue.base';
import type { IQueueScheduler } from '@common/queue/interfaces/queue.interface';
import { EnumNotificationQueue } from '@modules/notification/enums/notification.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';

@Injectable()
export class NotificationPushQueue extends QueueBase {
    private readonly timezone: string;
    private readonly cleanupStaleTokensCron: string;

    constructor(
        @InjectQueue(EnumNotificationQueue.notificationPush)
        protected readonly queue: Queue,
        private readonly configService: ConfigService,
        private readonly notificationUtil: NotificationUtil
    ) {
        super(queue);
        this.timezone = this.configService.get<string>('app.timezone')!;
        this.cleanupStaleTokensCron = this.configService.get<string>(
            'notification.push.cleanupStaleTokensCron'
        )!;
    }

    protected override schedulers(): IQueueScheduler[] {
        return [
            {
                id: EnumNotificationPushProcess.cleanupStaleTokens,
                repeat: {
                    pattern: this.cleanupStaleTokensCron,
                    tz: this.timezone,
                },
                template: {
                    name: EnumNotificationPushProcess.cleanupStaleTokens,
                    data: {},
                    opts: { priority: EnumQueuePriority.low },
                },
            },
        ];
    }

    sendEffect(
        kind: EnumNotificationKind,
        notificationId: string,
        context: INotificationSealedData,
        { userId, username, encryptedTokens }: INotificationRecipientRecord
    ): INotificationPushSendEffect {
        const { queuePriority } = NotificationKindContract[kind];
        const idempotencyKey = this.notificationUtil.toStepKey(
            notificationId,
            EnumNotificationPushProcess.send
        );

        return {
            queue: EnumNotificationQueue.notificationPush,
            name: EnumNotificationPushProcess.send,
            data: {
                kind,
                notificationId,
                userId,
                username,
                encryptedTokens,
                context,
                completedSteps: [],
                encryptedPendingTokens: null,
                encryptedFailureTokens: null,
            },
            priority: queuePriority,
            idempotencyKey,
        };
    }
}
