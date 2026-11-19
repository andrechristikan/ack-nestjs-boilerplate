import { EnumActivityLogQueue } from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogQueueFactory } from '@modules/activity-log/factories/activity-log.queue.factory';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ActivityLogRepository, ActivityLogService, ActivityLogUtil],
    exports: [ActivityLogService, ActivityLogUtil],
    imports: [
        BullModule.registerQueueAsync({
            name: EnumActivityLogQueue.activityLog,
            useClass: ActivityLogQueueFactory,
        }),
    ],
})
export class ActivityLogModule {}
