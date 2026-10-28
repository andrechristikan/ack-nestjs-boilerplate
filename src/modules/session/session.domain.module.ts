import { SessionRepositoryModule } from '@modules/session/session.repository.module';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionQueueFactory } from '@modules/session/factories/session.queue.factory';
import { EnumQueue } from '@queues/enums/queue.enum';
import { QueueConfigKey } from '@queues/constants/queue.constant';
import { BullModule } from '@nestjs/bullmq';
import { SessionUtil } from '@modules/session/utils/session.util';
import { Global, Module } from '@nestjs/common';
import { SessionAnalyticDomain } from '@modules/session/domains/session.analytic.domain';

/**
 * Global so the session domain service and the login cache helpers are reachable from any
 * module context.
 */
@Global()
@Module({
    controllers: [],
    providers: [
        SessionDomain,
        SessionCache,
        SessionUtil,
        SessionAnalyticDomain,
        SessionQueue,
    ],
    exports: [
        BullModule,
        SessionDomain,
        SessionCache,
        SessionAnalyticDomain,
        SessionQueue,
    ],
    imports: [
        SessionRepositoryModule,
        BullModule.registerQueueAsync({
            name: EnumQueue.session,
            configKey: QueueConfigKey,
            useClass: SessionQueueFactory,
        }),
    ],
})
export class SessionDomainModule {}
