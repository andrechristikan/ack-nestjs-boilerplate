import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoBulkRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-bulk-repository.abstract';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import { IDatabaseBulkRepositoryAbstract } from 'src/common/database/interfaces/database.bulk.repository.interface';
import { Role, RoleEntity } from 'src/modules/role/schemas/role.schema';

@Injectable()
export class RoleBulkRepository
    extends DatabaseMongoBulkRepositoryAbstract<Role>
    implements IDatabaseBulkRepositoryAbstract
{
    constructor(
        @DatabaseRepository(RoleEntity.name)
        private readonly roleModel: Model<Role>
    ) {
        super(roleModel);
    }
}
