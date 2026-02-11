import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
    controllers: [],
    providers: [ActivityLogService, ActivityLogRepository, ActivityLogUtil],
    exports: [ActivityLogService, ActivityLogRepository, ActivityLogUtil],
    imports: [],
})
export class ActivityLogModule {}
