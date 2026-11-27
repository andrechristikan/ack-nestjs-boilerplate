import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@common/queue/bases/queue.base';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IQueueScheduler } from '@common/queue/interfaces/queue.interface';
import {
    EnumSessionProcess,
    EnumSessionQueue,
} from '@modules/session/enums/session.enum';
import type {
    ISessionPurgeLoginsEffect,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';

@Injectable()
export class SessionQueue extends QueueBase {
    private readonly timezone: string;
    private readonly purgeExpiredCron: string;

    constructor(
        @InjectQueue(EnumSessionQueue.session)
        protected override readonly queue: Queue,
        private readonly configService: ConfigService
    ) {
        super(queue);
        this.timezone = this.configService.get<string>('app.timezone')!;
        this.purgeExpiredCron = this.configService.get<string>(
            'session.purgeExpiredCron'
        )!;
    }

    protected override schedulers(): IQueueScheduler[] {
        return [
            {
                id: EnumSessionProcess.purgeExpired,
                repeat: {
                    pattern: this.purgeExpiredCron,
                    tz: this.timezone,
                },
                template: {
                    name: EnumSessionProcess.purgeExpired,
                    data: {},
                    opts: { priority: EnumQueuePriority.low },
                },
            },
        ];
    }

    purgeLoginsEffect(
        userId: string,
        sessions: ISessionRef[]
    ): ISessionPurgeLoginsEffect {
        return {
            queue: EnumSessionQueue.session,
            name: EnumSessionProcess.purgeLogins,
            data: { userId, sessions },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };
    }
}
