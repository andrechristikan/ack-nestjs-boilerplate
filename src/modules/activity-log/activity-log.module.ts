import { ActivityLogRepositoryModule } from '@modules/activity-log/activity-log.repository.module';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { Global, Module } from '@nestjs/common';

/**
 * Global so the activity log domain service and util are injectable wherever `@ActivityLog`
 * is used, including from another module's repository.
 */
@Global()
@Module({
    controllers: [],
    providers: [ActivityLogService, ActivityLogUtil],
    exports: [ActivityLogService, ActivityLogUtil],
    imports: [ActivityLogRepositoryModule],
})
export class ActivityLogModule {}
