import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { SessionCache } from '@modules/session/caches/session.cache';
import { EnumSessionQueue } from '@modules/session/enums/session.enum';
import { SessionQueueFactory } from '@modules/session/factories/session.queue.factory';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionService } from '@modules/session/services/session.service';
import { SessionUtil } from '@modules/session/utils/session.util';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';

/** Shared module: SessionService for the JWT access strategy, the user module, and the user, mfa, and device use cases; SessionUtil for the user use cases. */
@Global()
@Module({})
export class SessionModule {
    static forRoot(): DynamicModule {
        return {
            module: SessionModule,
            controllers: [],
            providers: [
                SessionRepository,
                SessionService,
                SessionCache,
                SessionUtil,
                SessionQueue,
                {
                    provide: EnumSessionQueue.session,
                    useExisting: SessionQueue,
                },
            ],
            exports: [SessionService, SessionUtil, SessionQueue],
            imports: [
                ActivityLogModule,
                BullModule.registerQueueAsync({
                    name: EnumSessionQueue.session,
                    useClass: SessionQueueFactory,
                }),
            ],
        };
    }
}
