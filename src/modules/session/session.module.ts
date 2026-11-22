import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { DeviceModule } from '@modules/device/device.module';
import { SessionCache } from '@modules/session/caches/session.cache';
import { EnumSessionQueue } from '@modules/session/enums/session.enum';
import { SessionQueueFactory } from '@modules/session/factories/session.queue.factory';
import { SessionAnalyticRepository } from '@modules/session/repositories/session.analytic.repository';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionAnalyticService } from '@modules/session/services/session.analytic.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionUtil } from '@modules/session/utils/session.util';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';

/** Shared module: SessionService for the JWT access strategy, the user module, and the user and device use cases; SessionUtil for the user module and use cases; SessionAnalyticService for the analytic services. */
@Global()
@Module({})
export class SessionModule {
    static forRoot(): DynamicModule {
        return {
            module: SessionModule,
            controllers: [],
            providers: [
                SessionRepository,
                SessionAnalyticRepository,
                SessionService,
                SessionCache,
                SessionUtil,
                SessionAnalyticService,
            ],
            exports: [
                SessionService,
                SessionCache,
                SessionUtil,
                SessionAnalyticService,
            ],
            imports: [
                ActivityLogModule,
                DeviceModule,
                BullModule.registerQueueAsync({
                    name: EnumSessionQueue.session,
                    useClass: SessionQueueFactory,
                }),
            ],
        };
    }
}
