import { ActivityLogSharedModule } from '@modules/activity-log/activity-log.shared.module';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ActivityLogService],
    exports: [ActivityLogService],
    imports: [ActivityLogSharedModule],
})
export class ActivityLogModule {}
