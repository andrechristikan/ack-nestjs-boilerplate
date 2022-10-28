import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepositoryAbstract } from 'src/common/database/interfaces/database.repository.interface';
import {
    Permission,
    PermissionEntity,
} from 'src/modules/permission/schemas/permission.schema';

@Injectable()
export class PermissionRepository
    extends DatabaseMongoRepositoryAbstract<Permission>
    implements IDatabaseRepositoryAbstract<Permission>
{
    constructor(
        @DatabaseModel(PermissionEntity.name)
        private readonly permissionModel: Model<Permission>
    ) {
        super(permissionModel);
    }
}
