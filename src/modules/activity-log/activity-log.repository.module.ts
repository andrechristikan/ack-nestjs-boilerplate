import { ActivityLogUtilModule } from '@modules/activity-log/activity-log.util.module';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { Global, Module } from '@nestjs/common';

/**
 * Global so the interceptor writes activity logs from any route module context.
 */
@Global()
@Module({
    controllers: [],
    providers: [ActivityLogRepository],
    exports: [ActivityLogRepository],
    imports: [ActivityLogUtilModule],
})
export class ActivityLogRepositoryModule {}
