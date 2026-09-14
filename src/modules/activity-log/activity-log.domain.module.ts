import { ActivityLogRepositoryModule } from '@modules/activity-log/activity-log.repository.module';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { Global, Module } from '@nestjs/common';

/**
 * Global so the activity log domain service and util are injectable wherever `@ActivityLog`
 * is used, including from another module's repository.
 */
@Global()
@Module({
    controllers: [],
    providers: [ActivityLogDomain, ActivityLogUtil],
    exports: [ActivityLogDomain, ActivityLogUtil],
    imports: [ActivityLogRepositoryModule],
})
export class ActivityLogDomainModule {}
