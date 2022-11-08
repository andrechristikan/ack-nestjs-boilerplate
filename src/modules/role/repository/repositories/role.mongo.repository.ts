import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseMongoModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { PermissionMongoEntity } from 'src/modules/permission/repository/entities/permission.mongo.entity';
import { RoleMongoEntity } from 'src/modules/role/repository/entities/role.mongo.entity';

@Injectable()
export class RoleMongoRepository
    extends DatabaseMongoRepositoryAbstract<RoleMongoEntity>
    implements IDatabaseRepository<RoleMongoEntity>
{
    constructor(
        @DatabaseMongoModel(RoleMongoEntity)
        private readonly roleModel: Model<RoleMongoEntity>
    ) {
        super(roleModel, {
            path: 'permissions',
            match: '_id',
            model: PermissionMongoEntity.name,
        });
    }
}
