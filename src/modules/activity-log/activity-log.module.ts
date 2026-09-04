import { ActivityLogRepositoryModule } from '@modules/activity-log/activity-log.repository.module';
import { ActivityLogUtilModule } from '@modules/activity-log/activity-log.util.module';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { Global, Module } from '@nestjs/common';

/**
 * Global so the activity log domain service is injectable wherever `@ActivityLog` is used.
 */
@Global()
@Module({
    controllers: [],
    providers: [ActivityLogService],
    exports: [ActivityLogService],
    imports: [ActivityLogRepositoryModule, ActivityLogUtilModule],
})
export class ActivityLogModule {}
