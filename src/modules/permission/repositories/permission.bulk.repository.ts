import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongooseBulkRepositoryAbstract } from 'src/common/database/abstracts/database.mongoose-bulk-repository.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import {
    PermissionDocument,
    PermissionEntity,
} from 'src/modules/permission/schemas/permission.schema';

@Injectable()
export class PermissionBulkRepository extends DatabaseMongooseBulkRepositoryAbstract<PermissionDocument> {
    constructor(
        @DatabaseEntity(PermissionEntity.name)
        private readonly permissionModel: Model<PermissionDocument>
    ) {
        super(permissionModel);
    }
}
