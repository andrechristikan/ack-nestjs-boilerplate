import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ActivityLogRepository],
    exports: [ActivityLogRepository],
    imports: [],
})
export class ActivityLogRepositoryModule {}
