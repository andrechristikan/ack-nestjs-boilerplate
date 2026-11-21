import {
    EnumNotificationKind,
    EnumNotificationPushProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import type {
    INotificationPushCleanupTokensEffect,
    INotificationPushSendEffect,
    INotificationRecipientRecord,
    INotificationSealedData,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@common/queue/bases/queue.base';
import { EnumNotificationQueue } from '@modules/notification/enums/notification.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';

@Injectable()
export class NotificationPushQueue extends QueueBase implements OnModuleInit {
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

    async onModuleInit(): Promise<void> {
        await this.sendCleanupStaleTokens();
    }

    async sendCleanupStaleTokens(): Promise<void> {
        await this.queue.upsertJobScheduler(
            EnumNotificationPushProcess.cleanupStaleTokens,
            {
                pattern: this.cleanupStaleTokensCron,
                tz: this.timezone,
            },
            {
                name: EnumNotificationPushProcess.cleanupStaleTokens,
                data: {},
                opts: {
                    priority: EnumQueuePriority.low,
                },
            }
        );
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
            EnumNotificationStep.sendPush
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

    cleanupTokensEffect(
        userId: string,
        encryptedFailureTokens: string[]
    ): INotificationPushCleanupTokensEffect {
        return {
            queue: EnumNotificationQueue.notificationPush,
            name: EnumNotificationPushProcess.cleanupTokens,
            data: { userId, encryptedFailureTokens },
            priority: EnumQueuePriority.low,
            idempotencyKey: null,
        };
    }
}
