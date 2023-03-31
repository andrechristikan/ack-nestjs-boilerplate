import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/repositories/database.mongo.uuid.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    PermissionDoc,
    PermissionEntity,
} from 'src/modules/permission/repository/entities/permission.entity';

@Injectable()
export class PermissionRepository extends DatabaseMongoUUIDRepositoryAbstract<
    PermissionEntity,
    PermissionDoc
> {
    constructor(
        @DatabaseModel(PermissionEntity.name)
        private readonly permissionModel: Model<PermissionEntity>
    ) {
        super(permissionModel);
    }
}
