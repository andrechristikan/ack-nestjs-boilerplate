import { EnumActivityLogQueue } from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogQueueFactory } from '@modules/activity-log/factories/activity-log.queue.factory';
import { ActivityLogInterceptor } from '@modules/activity-log/interceptors/activity-log.interceptor';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { ActivityLogAnalyticRepository } from '@modules/activity-log/repositories/activity-log.analytic.repository';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogAnalyticService } from '@modules/activity-log/services/activity-log.analytic.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

/** Shared module: ActivityLogService for the use cases, ActivityLogAnalyticService for the analytic services, ActivityLogUtil for the user seed. */
@Global()
@Module({
    controllers: [],
    providers: [
        ActivityLogRepository,
        ActivityLogAnalyticRepository,
        ActivityLogService,
        ActivityLogUtil,
        {
            provide: APP_INTERCEPTOR,
            useClass: ActivityLogInterceptor,
        },
        ActivityLogAnalyticService,
        ActivityLogQueue,
    ],
    exports: [
        ActivityLogService,
        ActivityLogUtil,
        ActivityLogAnalyticService,
        ActivityLogQueue,
    ],
    imports: [
        BullModule.registerQueueAsync({
            name: EnumActivityLogQueue.activityLog,
            useClass: ActivityLogQueueFactory,
        }),
    ],
})
export class ActivityLogModule {}
