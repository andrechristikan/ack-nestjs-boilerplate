import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from '@common/database/constants/database.constant';
import {
    ActivityEntity,
    ActivitySchema,
} from '@module/activity/repository/entities/activity.entity';
import { ActivityRepository } from '@module/activity/repository/repositories/activity.repository';

@Module({
    providers: [ActivityRepository],
    exports: [ActivityRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: ActivityEntity.name,
                    schema: ActivitySchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class ActivityRepositoryModule {}
