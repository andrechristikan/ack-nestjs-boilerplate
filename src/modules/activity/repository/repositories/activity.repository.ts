import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseUUIDRepositoryBase } from '@common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import {
    ActivityDoc,
    ActivityEntity,
} from '@modules/activity/repository/entities/activity.entity';
import { CountryEntity } from '@modules/country/repository/entities/country.entity';
import { RoleEntity } from '@modules/role/repository/entities/role.entity';
import { UserEntity } from '@modules/user/repository/entities/user.entity';

@Injectable()
export class ActivityRepository extends DatabaseUUIDRepositoryBase<
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
