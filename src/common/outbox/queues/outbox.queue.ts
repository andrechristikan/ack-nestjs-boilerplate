import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@common/queue/bases/queue.base';
import type { IQueueScheduler } from '@common/queue/interfaces/queue.interface';
import {
    EnumOutboxProcess,
    EnumOutboxQueue,
} from '@common/outbox/enums/outbox.enum';

@Injectable()
export class OutboxQueue extends QueueBase {
    private readonly sweepIntervalInMs: number;
    private readonly sweepKeepCompleted: number;

    constructor(
        @InjectQueue(EnumOutboxQueue.outbox)
        protected override readonly queue: Queue,
        private readonly configService: ConfigService
    ) {
        super(queue);
        this.sweepIntervalInMs = this.configService.get<number>(
            'outbox.sweepIntervalInMs'
        )!;
        this.sweepKeepCompleted = this.configService.get<number>(
            'outbox.sweepKeepCompleted'
        )!;
    }

    protected override schedulers(): IQueueScheduler[] {
        return [
            {
                id: EnumOutboxProcess.sweep,
                repeat: { every: this.sweepIntervalInMs },
                template: {
                    name: EnumOutboxProcess.sweep,
                    data: {},
                    opts: {
                        removeOnComplete: { count: this.sweepKeepCompleted },
                    },
                },
            },
        ];
    }
}
