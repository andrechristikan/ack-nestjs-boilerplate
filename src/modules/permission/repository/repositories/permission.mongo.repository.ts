import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';

@Injectable()
export class PermissionRepository
    extends DatabaseMongoRepositoryAbstract<PermissionEntity>
    implements IDatabaseRepository<PermissionEntity>
{
    constructor(
        @DatabaseModel(PermissionEntity.name)
        private readonly permissionModel: Model<PermissionEntity>
    ) {
        super(permissionModel);
    }
}
