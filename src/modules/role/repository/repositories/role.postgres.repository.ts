import { Injectable } from '@nestjs/common';
import { DatabasePostgresRepositoryAbstract } from 'src/common/database/abstracts/database.postgres-repository.abstract';
import { DatabasePostgresModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { RolePostgresEntity } from 'src/modules/role/repository/entities/role.postgres.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RolePostgresRepository
    extends DatabasePostgresRepositoryAbstract<RolePostgresEntity>
    implements IDatabaseRepository<RolePostgresEntity>
{
    constructor(
        @DatabasePostgresModel(RolePostgresEntity)
        private readonly RoleModel: Repository<RolePostgresEntity>
    ) {
        super(RoleModel, {
            permissions: true,
        });
    }
}
