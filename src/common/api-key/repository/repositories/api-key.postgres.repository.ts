import { Injectable } from '@nestjs/common';
import { ApiKeyPostgresEntity } from 'src/common/api-key/repository/entity/api-key.postgres.entity';
import { DatabasePostgresRepositoryAbstract } from 'src/common/database/abstracts/database.postgres-repository.abstract';
import { DatabasePostgresModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { Repository } from 'typeorm';

@Injectable()
export class ApiKeyPostgresRepository
    extends DatabasePostgresRepositoryAbstract<ApiKeyPostgresEntity>
    implements IDatabaseRepository<ApiKeyPostgresEntity>
{
    constructor(
        @DatabasePostgresModel(ApiKeyPostgresEntity)
        private readonly apiKeyModel: Repository<ApiKeyPostgresEntity>
    ) {
        super(apiKeyModel);
    }
}
