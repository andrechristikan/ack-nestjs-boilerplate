import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ActivityLogRepository, ActivityLogUtil],
    exports: [ActivityLogRepository, ActivityLogUtil],
    imports: [],
})
export class ActivityLogSharedModule {}
