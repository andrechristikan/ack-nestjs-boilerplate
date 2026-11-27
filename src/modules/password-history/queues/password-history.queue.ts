import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@common/queue/bases/queue.base';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IQueueScheduler } from '@common/queue/interfaces/queue.interface';
import {
    EnumPasswordHistoryProcess,
    EnumPasswordHistoryQueue,
} from '@modules/password-history/enums/password-history.enum';

@Injectable()
export class PasswordHistoryQueue extends QueueBase {
    private readonly timezone: string;
    private readonly purgeExpiredCron: string;

    constructor(
        @InjectQueue(EnumPasswordHistoryQueue.passwordHistory)
        protected override readonly queue: Queue,
        private readonly configService: ConfigService
    ) {
        super(queue);
        this.timezone = this.configService.get<string>('app.timezone')!;
        this.purgeExpiredCron = this.configService.get<string>(
            'passwordHistory.purgeExpiredCron'
        )!;
    }

    protected override schedulers(): IQueueScheduler[] {
        return [
            {
                id: EnumPasswordHistoryProcess.purgeExpired,
                repeat: {
                    pattern: this.purgeExpiredCron,
                    tz: this.timezone,
                },
                template: {
                    name: EnumPasswordHistoryProcess.purgeExpired,
                    data: {},
                    opts: { priority: EnumQueuePriority.low },
                },
            },
        ];
    }
}
