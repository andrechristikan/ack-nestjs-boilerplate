import { Injectable } from '@nestjs/common';
import { Model, PopulateOptions } from 'mongoose';
import { DatabaseUUIDRepositoryBase } from '@common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import { CountryEntity } from '@module/country/repository/entities/country.entity';
import { RoleEntity } from '@module/role/repository/entities/role.entity';
import {
    UserDoc,
    UserEntity,
} from '@module/user/repository/entities/user.entity';

@Injectable()
export class UserRepository extends DatabaseUUIDRepositoryBase<
    UserEntity,
    UserDoc
> {
    readonly _joinActive: PopulateOptions[] = [
        {
            path: 'role',
            localField: 'role',
            foreignField: '_id',
            model: RoleEntity.name,
            justOne: true,
            match: {
                isActive: true,
            },
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
    ];

    constructor(
        @InjectDatabaseModel(UserEntity.name)
        private readonly userModel: Model<UserEntity>
    ) {
        super(userModel, [
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
        ]);
    }
}
