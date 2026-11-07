import { SessionCache } from '@modules/session/caches/session.cache';
import { EnumSessionQueue } from '@modules/session/enums/session.enum';
import { SessionQueueFactory } from '@modules/session/factories/session.queue.factory';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionAnalyticRepository } from '@modules/session/repositories/session.analytic.repository';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionAnalyticService } from '@modules/session/services/session.analytic.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionUtil } from '@modules/session/utils/session.util';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';

/** Shared module: SessionService for the JWT access strategy and the user and device use cases; SessionQueue for the user and device use cases; SessionUtil for the user use cases; SessionAnalyticService for the analytic services. */
@Global()
@Module({
    controllers: [],
    providers: [
        SessionRepository,
        SessionAnalyticRepository,
        SessionService,
        SessionCache,
        SessionUtil,
        SessionAnalyticService,
        SessionQueue,
    ],
    exports: [
        SessionService,
        SessionCache,
        SessionUtil,
        SessionAnalyticService,
        SessionQueue,
    ],
    imports: [
        BullModule.registerQueueAsync({
            name: EnumSessionQueue.session,
            useClass: SessionQueueFactory,
        }),
    ],
})
export class SessionModule {}
