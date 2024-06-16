import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/repositories/database.mongo.uuid.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { CountryEntity } from 'src/modules/country/repository/entities/country.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class UserRepository extends DatabaseMongoUUIDRepositoryAbstract<
    UserEntity,
    UserDoc
> {
    constructor(
        @DatabaseModel(UserEntity.name)
        private readonly userModel: Model<UserEntity>
    ) {
        super(userModel, [
            {
                field: 'role',
                localKey: 'role',
                foreignKey: '_id',
                model: RoleEntity.name,
                justOne: true,
            },
            {
                field: 'country',
                localKey: 'country',
                foreignKey: '_id',
                model: CountryEntity.name,
                justOne: true,
            },
        ]);
    }
}
