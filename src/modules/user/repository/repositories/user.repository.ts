import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class UserRepository
    extends DatabaseMongoRepositoryAbstract<UserEntity>
    implements IDatabaseRepository<UserEntity>
{
    constructor(
        @DatabaseModel(UserEntity.name)
        private readonly userModel: Model<UserEntity>
    ) {
        super(userModel, {
            path: 'role',
            match: '_id',
            model: RoleEntity.name,
            populate: {
                path: 'permissions',
                match: '_id',
                model: PermissionEntity.name,
            },
        });
    }
}
