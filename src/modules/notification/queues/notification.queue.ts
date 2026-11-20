import { CacheService } from '@common/cache/services/cache.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { QueueBase } from '@common/queue/bases/queue.base';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import {
    EnumNotificationKeyPattern,
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationContextMap,
    INotificationKeyPatterns,
    INotificationNotifyEffect,
    INotificationSealedRecord,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationQueue extends QueueBase {
    private readonly keyPatterns: INotificationKeyPatterns;

    constructor(
        @InjectQueue(EnumNotificationQueue.notification)
        protected readonly queue: Queue,
        protected readonly cacheService: CacheService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly notificationUtil: NotificationUtil
    ) {
        super(queue, cacheService);
        const userPattern = this.configService.get<string>(
            'notification.idempotencyKey.userPattern'
        )!;
        const referencePattern = this.configService.get<string>(
            'notification.idempotencyKey.referencePattern'
        )!;
        const joinRequestPattern = this.configService.get<string>(
            'notification.idempotencyKey.joinRequestPattern'
        )!;
        const userTermPolicyPattern = this.configService.get<string>(
            'notification.idempotencyKey.userTermPolicyPattern'
        )!;
        this.keyPatterns = {
            [EnumNotificationKeyPattern.userPattern]: userPattern,
            [EnumNotificationKeyPattern.referencePattern]: referencePattern,
            [EnumNotificationKeyPattern.joinRequestPattern]: joinRequestPattern,
            [EnumNotificationKeyPattern.userTermPolicyPattern]:
                userTermPolicyPattern,
        };
    }

    private toKeyValues(
        process: string,
        sealed: INotificationSealedRecord
    ): Record<string, string> {
        const values: Record<string, string> = { process };
        for (const [field, value] of Object.entries(sealed)) {
            if (typeof value === 'string') {
                values[field] = value;
            }
        }

        return values;
    }

    /** The outbox effect that resolves the recipient, creates the notification, and fans it out; each secret of the kind is encrypted against the recipient's user id. */
    notify<K extends EnumNotificationKind>(
        kind: K,
        context: INotificationContextMap[K]
    ): INotificationNotifyEffect {
        const { userId, proceedBy } = context;
        const { secrets, keyPattern, queuePriority } =
            NotificationKindContract[kind];
        const sealed = this.notificationUtil.sealContext(
            context,
            secrets,
            userId
        );
        const snapshot = 'snapshot' in context ? context.snapshot : null;
        const verificationId =
            'verificationId' in context ? context.verificationId : null;
        let idempotencyKey: string | null = null;
        if (keyPattern !== null) {
            const values = this.toKeyValues(kind, sealed);
            idempotencyKey = this.helperStringService.fillPattern(
                this.keyPatterns[keyPattern],
                values
            );
        }

        return {
            queue: EnumNotificationQueue.notification,
            name: EnumNotificationProcess.notify,
            data: {
                kind,
                context: {
                    ...sealed,
                    userId,
                    proceedBy,
                    snapshot,
                    verificationId,
                },
                recipient: null,
                notificationId: null,
            },
            priority: queuePriority,
            idempotencyKey,
        };
    }
}
