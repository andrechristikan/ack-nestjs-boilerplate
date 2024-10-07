import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    ActivityEntity,
    ActivitySchema,
} from 'src/modules/activity/repository/entities/activity.entity';
import { ActivityRepository } from 'src/modules/activity/repository/repositories/activity.repository';

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
