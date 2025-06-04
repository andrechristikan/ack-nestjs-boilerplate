import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseUUIDRepositoryBase } from '@common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import { CountryEntity } from '@module/country/repository/entities/country.entity';
import {
    PasswordHistoryDoc,
    PasswordHistoryEntity,
} from '@module/password-history/repository/entities/password-history.entity';
import { RoleEntity } from '@module/role/repository/entities/role.entity';
import { UserEntity } from '@module/user/repository/entities/user.entity';

@Injectable()
export class PasswordHistoryRepository extends DatabaseUUIDRepositoryBase<
    PasswordHistoryEntity,
    PasswordHistoryDoc
> {
    constructor(
        @InjectDatabaseModel(PasswordHistoryEntity.name)
        private readonly passwordHistoryModel: Model<PasswordHistoryEntity>
    ) {
        super(passwordHistoryModel, {
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
