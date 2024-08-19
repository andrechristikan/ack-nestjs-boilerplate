import { Module } from '@nestjs/common';
import { ActivityRepositoryModule } from 'src/modules/activity/repository/activity.module';
import { ActivityService } from 'src/modules/activity/services/activity.service';

@Module({
    imports: [ActivityRepositoryModule],
    exports: [ActivityService],
    providers: [ActivityService],
    controllers: [],
})
export class ActivityModule {}
