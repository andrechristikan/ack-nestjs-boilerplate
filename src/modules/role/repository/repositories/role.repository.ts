import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import { RoleEntity } from '@modules/role/repository/entities/role.entity';
import { DatabaseRepositoryBase } from '@common/database/bases/database.repository';

@Injectable()
export class RoleRepository extends DatabaseRepositoryBase<RoleEntity> {
    constructor(
        @InjectDatabaseModel(RoleEntity.name)
        private readonly roleModel: Model<RoleEntity>
    ) {
        super(roleModel);
    }
}
