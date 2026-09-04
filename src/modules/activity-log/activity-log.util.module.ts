import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { Global, Module } from '@nestjs/common';

/**
 * Global so the interceptor and the seeds reach the util wherever `@ActivityLog` is used.
 */
@Global()
@Module({
    controllers: [],
    providers: [ActivityLogUtil],
    exports: [ActivityLogUtil],
    imports: [],
})
export class ActivityLogUtilModule {}
