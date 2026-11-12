import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { CacheService } from '@common/cache/services/cache.service';
import { QueueBase } from '@common/queue/bases/queue.base';
import {
    EnumOutboxProcess,
    EnumOutboxQueue,
} from '@modules/outbox/enums/outbox.enum';

@Injectable()
export class OutboxQueue extends QueueBase implements OnModuleInit {
    private readonly sweepIntervalInMs: number;
    private readonly sweepKeepCompleted: number;

    constructor(
        @InjectQueue(EnumOutboxQueue.outbox) protected readonly queue: Queue,
        protected readonly cacheService: CacheService,
        private readonly configService: ConfigService
    ) {
        super(queue, cacheService);
        this.sweepIntervalInMs = this.configService.get<number>(
            'outbox.sweepIntervalInMs'
        )!;
        this.sweepKeepCompleted = this.configService.get<number>(
            'outbox.sweepKeepCompleted'
        )!;
    }

    async onModuleInit(): Promise<void> {
        await this.queue.upsertJobScheduler(
            EnumOutboxProcess.sweep,
            { every: this.sweepIntervalInMs },
            {
                name: EnumOutboxProcess.sweep,
                data: {},
                opts: { removeOnComplete: { count: this.sweepKeepCompleted } },
            }
        );
    }
}
