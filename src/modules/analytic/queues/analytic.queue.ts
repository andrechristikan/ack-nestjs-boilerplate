import { QueueBase } from '@common/queue/bases/queue.base';
import type { IQueueScheduler } from '@common/queue/interfaces/queue.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import {
    EnumAnalyticProcess,
    EnumAnalyticQueue,
} from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticRefreshSnapshotPayload } from '@modules/analytic/interfaces/analytic.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

@Injectable()
export class AnalyticQueue extends QueueBase {
    private readonly refreshIntervalInMs: number;

    constructor(
        @InjectQueue(EnumAnalyticQueue.analytic)
        protected override readonly queue: Queue,
        private readonly configService: ConfigService
    ) {
        super(queue);
        this.refreshIntervalInMs = this.configService.get<number>(
            'analytic.snapshot.refreshIntervalInMs'
        )!;
    }

    protected override schedulers(): IQueueScheduler[] {
        return Object.values(EnumAnalyticSnapshotSignal).map(signal => {
            const data: IAnalyticRefreshSnapshotPayload = { signal };

            return {
                id: `${EnumAnalyticProcess.refreshSnapshot}:${signal}`,
                repeat: { every: this.refreshIntervalInMs, immediately: true },
                template: {
                    name: EnumAnalyticProcess.refreshSnapshot,
                    data,
                    opts: { priority: EnumQueuePriority.low },
                },
            };
        });
    }
}
