import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/database.mongo-uuid-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';

@Injectable()
export class PermissionRepository
    extends DatabaseMongoUUIDRepositoryAbstract<PermissionEntity>
    implements IDatabaseRepository<PermissionEntity>
{
    constructor(
        @DatabaseModel(PermissionEntity.name)
        private readonly permissionModel: Model<PermissionEntity>
    ) {
        super(permissionModel);
    }
}
