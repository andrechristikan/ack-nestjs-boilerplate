import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepositoryAbstract } from 'src/common/database/interfaces/database.repository.interface';
import { PermissionEntity } from 'src/modules/permission/schemas/permission.schema';
import { Role, RoleEntity } from 'src/modules/role/schemas/role.schema';

@Injectable()
export class RoleRepository
    extends DatabaseMongoRepositoryAbstract<Role>
    implements IDatabaseRepositoryAbstract<Role>
{
    constructor(
        @DatabaseModel(RoleEntity.name)
        private readonly roleModel: Model<Role>
    ) {
        super(roleModel, {
            field: 'permissions',
            foreignField: '_id',
            with: PermissionEntity.name,
        });
    }
}
