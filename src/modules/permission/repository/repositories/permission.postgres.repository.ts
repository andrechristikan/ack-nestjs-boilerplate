import { Injectable } from '@nestjs/common';
import { DatabasePostgresRepositoryAbstract } from 'src/common/database/abstracts/database.postgres-repository.abstract';
import { DatabasePostgresModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { PermissionPostgresEntity } from 'src/modules/permission/repository/entities/permission.postgres.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PermissionPostgresRepository
    extends DatabasePostgresRepositoryAbstract<PermissionPostgresEntity>
    implements IDatabaseRepository<PermissionPostgresEntity>
{
    constructor(
        @DatabasePostgresModel(PermissionPostgresEntity)
        private readonly permissionModel: Repository<PermissionPostgresEntity>
    ) {
        super(permissionModel);
    }
}
