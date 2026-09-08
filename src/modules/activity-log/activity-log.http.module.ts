import { ActivityLogHttpService } from '@modules/activity-log/services/activity-log.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ActivityLogHttpService],
    exports: [ActivityLogHttpService],
    imports: [],
})
export class ActivityLogHttpModule {}
