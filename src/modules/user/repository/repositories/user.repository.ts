import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/database.mongo-uuid-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class UserRepository
    extends DatabaseMongoUUIDRepositoryAbstract<UserEntity>
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
