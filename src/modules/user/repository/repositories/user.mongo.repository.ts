import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseMongoModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { RoleMongoEntity } from 'src/modules/role/repository/entities/role.mongo.entity';
import { UserMongoEntity } from 'src/modules/user/repository/entities/user.mongo.entity';

@Injectable()
export class UserMongoRepository
    extends DatabaseMongoRepositoryAbstract<UserMongoEntity>
    implements IDatabaseRepository<UserMongoEntity>
{
    constructor(
        @DatabaseMongoModel(UserMongoEntity)
        private readonly userModel: Model<UserMongoEntity>
    ) {
        super(userModel, {
            path: 'role',
            match: '_id',
            model: RoleMongoEntity.name,
            populate: {
                path: 'permissions',
                match: '_id',
                model: PermissionEntity.name,
            },
        });
    }
}
