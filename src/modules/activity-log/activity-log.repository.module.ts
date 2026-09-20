import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { Module } from '@nestjs/common';
import { ActivityLogAnalyticRepository } from '@modules/activity-log/repositories/activity-log.analytic.repository';

@Module({
    controllers: [],
    providers: [ActivityLogRepository, ActivityLogAnalyticRepository],
    exports: [ActivityLogRepository, ActivityLogAnalyticRepository],
    imports: [],
})
export class ActivityLogRepositoryModule {}
