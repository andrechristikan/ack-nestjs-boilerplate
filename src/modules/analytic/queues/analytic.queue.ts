import { CacheService } from '@common/cache/services/cache.service';
import { QueueBase } from '@common/queue/bases/queue.base';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import {
    EnumAnalyticProcess,
    EnumAnalyticQueue,
} from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticRefreshSnapshotPayload } from '@modules/analytic/interfaces/analytic.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

@Injectable()
export class AnalyticQueue extends QueueBase implements OnModuleInit {
    private readonly refreshIntervalInMs: number;

    constructor(
        @InjectQueue(EnumAnalyticQueue.analytic)
        protected readonly queue: Queue,
        protected readonly cacheService: CacheService,
        private readonly configService: ConfigService
    ) {
        super(queue, cacheService);
        this.refreshIntervalInMs = this.configService.get<number>(
            'analytic.snapshot.refreshIntervalInMs'
        )!;
    }

    private async scheduleRefresh(
        signal: EnumAnalyticSnapshotSignal
    ): Promise<void> {
        const data: IAnalyticRefreshSnapshotPayload = { signal };

        await this.queue.upsertJobScheduler(
            `${EnumAnalyticProcess.refreshSnapshot}:${signal}`,
            { every: this.refreshIntervalInMs, immediately: true },
            {
                name: EnumAnalyticProcess.refreshSnapshot,
                data,
                opts: { priority: EnumQueuePriority.low },
            }
        );
    }

    async onModuleInit(): Promise<void> {
        await Promise.all(
            Object.values(EnumAnalyticSnapshotSignal).map(signal =>
                this.scheduleRefresh(signal)
            )
        );
    }
}
