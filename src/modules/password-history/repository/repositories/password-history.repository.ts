import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseRepositoryBase } from 'src/common/database/bases/database.repository';
import { InjectDatabaseModel } from 'src/common/database/decorators/database.decorator';
import { CountryEntity } from 'src/modules/country/repository/entities/country.entity';
import {
    PasswordHistoryDoc,
    PasswordHistoryEntity,
} from 'src/modules/password-history/repository/entities/password-history.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class PasswordHistoryRepository extends DatabaseRepositoryBase<
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
