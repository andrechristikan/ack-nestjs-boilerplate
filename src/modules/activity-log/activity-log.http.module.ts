import { ActivityLogHttpService } from '@modules/activity-log/services/http/activity-log.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ActivityLogHttpService],
    exports: [ActivityLogHttpService],
    imports: [],
})
export class ActivityLogHttpModule {}
