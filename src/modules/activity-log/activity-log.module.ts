import { EnumActivityLogQueue } from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogQueueFactory } from '@modules/activity-log/factories/activity-log.queue.factory';
import { ActivityLogAnalyticRepository } from '@modules/activity-log/repositories/activity-log.analytic.repository';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogAnalyticService } from '@modules/activity-log/services/activity-log.analytic.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        ActivityLogRepository,
        ActivityLogAnalyticRepository,
        ActivityLogService,
        ActivityLogUtil,
        ActivityLogAnalyticService,
    ],
    exports: [ActivityLogService, ActivityLogUtil, ActivityLogAnalyticService],
    imports: [
        BullModule.registerQueueAsync({
            name: EnumActivityLogQueue.activityLog,
            useClass: ActivityLogQueueFactory,
        }),
    ],
})
export class ActivityLogModule {}
