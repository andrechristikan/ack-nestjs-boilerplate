import { CacheService } from '@common/cache/services/cache.service';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
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
    private readonly defTz: string;
    private readonly cleanupStaleTokensCron: string;

    constructor(
        @InjectQueue(EnumNotificationQueue.notificationPush)
        protected readonly queue: Queue,
        protected readonly cacheService: CacheService,
        private readonly configService: ConfigService
    ) {
        super(queue, cacheService);
        this.defTz = this.configService.get<string>('app.timezone')!;
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
                tz: this.defTz,
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
}
