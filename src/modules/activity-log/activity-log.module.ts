import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogMetadataStoreService } from '@modules/activity-log/services/activity-log.metadata-store.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
    controllers: [],
    providers: [
        ActivityLogService,
        ActivityLogRepository,
        ActivityLogUtil,
        ActivityLogMetadataStoreService,
    ],
    exports: [
        ActivityLogService,
        ActivityLogRepository,
        ActivityLogUtil,
        ActivityLogMetadataStoreService,
    ],
    imports: [],
})
export class ActivityLogModule {}
