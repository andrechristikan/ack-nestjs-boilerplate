import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';

@Injectable()
export class RoleRepository
    extends DatabaseMongoRepositoryAbstract<RoleEntity>
    implements IDatabaseRepository<RoleEntity>
{
    constructor(
        @DatabaseModel(RoleEntity)
        private readonly roleModel: Model<RoleEntity>
    ) {
        super(roleModel, {
            path: 'permissions',
            match: '_id',
            model: PermissionEntity.name,
        });
    }
}
