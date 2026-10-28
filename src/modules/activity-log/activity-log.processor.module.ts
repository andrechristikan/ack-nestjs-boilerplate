import { ActivityLogDomainModule } from '@modules/activity-log/activity-log.domain.module';
import { ActivityLogProcessor } from '@modules/activity-log/processors/activity-log.processor';
import { ActivityLogProcessorService } from '@modules/activity-log/services/activity-log.processor.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ActivityLogProcessor, ActivityLogProcessorService],
    exports: [],
    imports: [ActivityLogDomainModule],
})
export class ActivityLogProcessorModule {}
