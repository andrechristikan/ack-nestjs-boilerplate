import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseUUIDRepositoryBase } from '@common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import {
    RoleDoc,
    RoleEntity,
} from '@module/role/repository/entities/role.entity';

@Injectable()
export class RoleRepository extends DatabaseUUIDRepositoryBase<
    RoleEntity,
    RoleDoc
> {
    constructor(
        @InjectDatabaseModel(RoleEntity.name)
        private readonly roleModel: Model<RoleEntity>
    ) {
        super(roleModel);
    }
}
