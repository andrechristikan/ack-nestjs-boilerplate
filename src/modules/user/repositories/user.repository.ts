import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepositoryAbstract } from 'src/common/database/interfaces/database.repository.interface';
import { PermissionEntity } from 'src/modules/permission/schemas/permission.schema';
import { RoleEntity } from 'src/modules/role/schemas/role.schema';
import { User, UserEntity } from 'src/modules/user/schemas/user.schema';

@Injectable()
export class UserRepository
    extends DatabaseMongoRepositoryAbstract<User>
    implements IDatabaseRepositoryAbstract<User>
{
    constructor(
        @DatabaseModel(UserEntity.name)
        private readonly userModel: Model<User>
    ) {
        super(userModel, {
            field: 'role',
            foreignField: '_id',
            with: RoleEntity.name,
            deepJoin: {
                field: 'permissions',
                foreignField: '_id',
                with: PermissionEntity.name,
            },
        });
    }
}
