import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoBulkRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-bulk-repository.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { IDatabaseBulkRepositoryAbstract } from 'src/common/database/interfaces/database.bulk.repository.interface';
import {
    PermissionDocument,
    PermissionEntity,
} from 'src/modules/permission/schemas/permission.schema';

@Injectable()
export class PermissionBulkRepository
    extends DatabaseMongoBulkRepositoryAbstract<PermissionDocument>
    implements IDatabaseBulkRepositoryAbstract
{
    constructor(
        @DatabaseEntity(PermissionEntity.name)
        private readonly permissionModel: Model<PermissionDocument>
    ) {
        super(permissionModel);
    }
}
