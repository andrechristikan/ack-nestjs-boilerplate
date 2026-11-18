import { CacheService } from '@common/cache/services/cache.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@common/queue/bases/queue.base';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';

@Injectable()
export class UserQueue extends QueueBase implements OnModuleInit {
    private readonly timezone: string;
    private readonly purgeExpiredCron: string;

    constructor(
        @InjectQueue(EnumUserQueue.user)
        protected readonly queue: Queue,
        protected readonly cacheService: CacheService,
        private readonly configService: ConfigService
    ) {
        super(queue, cacheService);
        this.timezone = this.configService.get<string>('app.timezone')!;
        this.purgeExpiredCron = this.configService.get<string>(
            'user.purgeExpiredCron'
        )!;
    }

    async onModuleInit(): Promise<void> {
        await this.queue.upsertJobScheduler(
            EnumUserProcess.purgeExpired,
            {
                pattern: this.purgeExpiredCron,
                tz: this.timezone,
            },
            {
                name: EnumUserProcess.purgeExpired,
                data: {},
                opts: {
                    priority: EnumQueuePriority.low,
                },
            }
        );
    }
}
