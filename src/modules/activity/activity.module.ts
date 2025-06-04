import { Module } from '@nestjs/common';
import { ActivityRepositoryModule } from '@module/activity/repository/activity.repository.module';
import { ActivityService } from '@module/activity/services/activity.service';

@Module({
    imports: [ActivityRepositoryModule],
    exports: [ActivityService],
    providers: [ActivityService],
    controllers: [],
})
export class ActivityModule {}
