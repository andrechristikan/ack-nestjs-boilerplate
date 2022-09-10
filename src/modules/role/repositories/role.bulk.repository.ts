import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongooseBulkRepositoryAbstract } from 'src/common/database/abstracts/database.mongoose-bulk-repository.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { RoleDocument, RoleEntity } from 'src/modules/role/schemas/role.schema';

@Injectable()
export class RoleBulkRepository extends DatabaseMongooseBulkRepositoryAbstract<RoleDocument> {
    constructor(
        @DatabaseEntity(RoleEntity.name)
        private readonly roleModel: Model<RoleDocument>
    ) {
        super(roleModel);
    }
}
