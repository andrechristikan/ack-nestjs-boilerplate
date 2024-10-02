import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseRepositoryBase } from 'src/common/database/bases/database.repository';
import { InjectDatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    ActivityDoc,
    ActivityEntity,
} from 'src/modules/activity/repository/entities/activity.entity';
import { CountryEntity } from 'src/modules/country/repository/entities/country.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
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
            populate: [
                {
                    path: 'role',
                    localField: 'role',
                    foreignField: '_id',
                    model: RoleEntity.name,
                    justOne: true,
                },
                {
                    path: 'country',
                    localField: 'country',
                    foreignField: '_id',
                    model: CountryEntity.name,
                    justOne: true,
                },
                {
                    path: 'mobileNumber.country',
                    localField: 'mobileNumber.country',
                    foreignField: '_id',
                    model: CountryEntity.name,
                    justOne: true,
                },
            ],
        });
    }
}
