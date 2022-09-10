import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongooseRepositoryAbstract } from 'src/common/database/abstracts/database.mongoose-repository.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { PermissionEntity } from 'src/modules/permission/schemas/permission.schema';
import { RoleEntity } from 'src/modules/role/schemas/role.schema';
import { UserDocument, UserEntity } from 'src/modules/user/schemas/user.schema';

@Injectable()
export class UserRepository extends DatabaseMongooseRepositoryAbstract<UserDocument> {
    constructor(
        @DatabaseEntity(UserEntity.name)
        private readonly userModel: Model<UserDocument>
    ) {
        super(userModel, {
            path: 'role',
            model: RoleEntity.name,
            populate: {
                path: 'permissions',
                model: PermissionEntity.name,
            },
        });
    }
}
