import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseMongoModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { PermissionMongoEntity } from 'src/modules/permission/repository/entities/permission.mongo.entity';

@Injectable()
export class PermissionMongoRepository
    extends DatabaseMongoRepositoryAbstract<PermissionMongoEntity>
    implements IDatabaseRepository<PermissionMongoEntity>
{
    constructor(
        @DatabaseMongoModel(PermissionMongoEntity.name)
        private readonly permissionModel: Model<PermissionMongoEntity>
    ) {
        super(permissionModel);
    }
}
