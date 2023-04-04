import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/repositories/database.mongo.uuid.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    RoleDoc,
    RoleEntity,
} from 'src/common/role/repository/entities/role.entity';

@Injectable()
export class RoleRepository extends DatabaseMongoUUIDRepositoryAbstract<
    RoleEntity,
    RoleDoc
> {
    constructor(
        @DatabaseModel(RoleEntity.name)
        private readonly roleModel: Model<RoleEntity>
    ) {
        super(roleModel);
    }
}
