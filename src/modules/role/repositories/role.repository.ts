import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongooseRepositoryAbstract } from 'src/common/database/abstracts/database.mongoose-repository.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { PermissionEntity } from 'src/modules/permission/schemas/permission.schema';
import { RoleDocument, RoleEntity } from 'src/modules/role/schemas/role.schema';

@Injectable()
export class RoleRepository extends DatabaseMongooseRepositoryAbstract<RoleDocument> {
    constructor(
        @DatabaseEntity(RoleEntity.name)
        private readonly roleModel: Model<RoleDocument>
    ) {
        super(roleModel, {
            path: 'permissions',
            model: PermissionEntity.name,
        });
    }
}
