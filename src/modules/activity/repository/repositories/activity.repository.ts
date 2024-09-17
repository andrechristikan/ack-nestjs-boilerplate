import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseRepositoryBase } from 'src/common/database/bases/database.repository';
import { InjectDatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    ActivityDoc,
    ActivityEntity,
} from 'src/modules/activity/repository/entities/activity.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class ActivityRepository extends DatabaseRepositoryBase<
    ActivityEntity,
    ActivityDoc
> {
    constructor(
        @InjectDatabaseModel(ActivityEntity.name)
        private readonly activityModel: Model<ActivityEntity>
    ) {
        super(activityModel, {
            path: 'by',
            localField: 'by',
            foreignField: '_id',
            model: UserEntity.name,
            justOne: true,
        });
    }
}
