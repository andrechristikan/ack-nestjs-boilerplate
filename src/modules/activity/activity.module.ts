import { Module } from '@nestjs/common';
import { ActivityRepositoryModule } from '@modules/activity/repository/activity.repository.module';
import { ActivityService } from '@modules/activity/services/activity.service';

@Module({
    imports: [ActivityRepositoryModule],
    exports: [ActivityService],
    providers: [ActivityService],
    controllers: [],
})
export class ActivityModule {}
