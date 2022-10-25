import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoBulkRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-bulk-repository.abstract';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import { IDatabaseBulkRepositoryAbstract } from 'src/common/database/interfaces/database.bulk.repository.interface';
import {
    Permission,
    PermissionEntity,
} from 'src/modules/permission/schemas/permission.schema';

@Injectable()
export class PermissionBulkRepository
    extends DatabaseMongoBulkRepositoryAbstract<Permission>
    implements IDatabaseBulkRepositoryAbstract
{
    constructor(
        @DatabaseRepository(PermissionEntity.name)
        private readonly permissionModel: Model<Permission>
    ) {
        super(permissionModel);
    }
}
