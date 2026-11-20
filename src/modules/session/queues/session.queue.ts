import { CacheService } from '@common/cache/services/cache.service';
import { QueueBase } from '@common/queue/bases/queue.base';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumSessionProcess,
    EnumSessionQueue,
} from '@modules/session/enums/session.enum';
import type {
    ISessionPurgeLoginsEffect,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class SessionQueue extends QueueBase {
    constructor(
        @InjectQueue(EnumSessionQueue.session)
        protected readonly queue: Queue,
        protected readonly cacheService: CacheService
    ) {
        super(queue, cacheService);
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
