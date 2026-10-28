import { ActivityLogRepositoryModule } from '@modules/activity-log/activity-log.repository.module';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ActivityLogInterceptor } from '@modules/activity-log/interceptors/activity-log.interceptor';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { ActivityLogQueueFactory } from '@modules/activity-log/factories/activity-log.queue.factory';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { QueueConfigKey } from '@queues/constants/queue.constant';
import { EnumQueue } from '@queues/enums/queue.enum';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';

/**
 * Global so the activity log domain, util, and always-on flush interceptor are
 * injectable across the HTTP stack.
 */
@Global()
@Module({
    controllers: [],
    providers: [
        ActivityLogDomain,
        ActivityLogUtil,
        {
            provide: APP_INTERCEPTOR,
            useClass: ActivityLogInterceptor,
        },
        ActivityLogAnalyticDomain,
        ActivityLogQueue,
    ],
    exports: [
        BullModule,
        ActivityLogDomain,
        ActivityLogUtil,
        ActivityLogAnalyticDomain,
        ActivityLogQueue,
    ],
    imports: [
        ActivityLogRepositoryModule,
        BullModule.registerQueueAsync({
            name: EnumQueue.activityLog,
            configKey: QueueConfigKey,
            useClass: ActivityLogQueueFactory,
        }),
    ],
})
export class ActivityLogDomainModule {}
