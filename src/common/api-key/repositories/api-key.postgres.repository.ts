import { Injectable } from '@nestjs/common';
import { ApiKeyEntity } from 'src/common/api-key/schemas/api-key.schema';
import { DatabasePostgresRepositoryAbstract } from 'src/common/database/abstracts/database.postgres-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { Repository } from 'typeorm';

@Injectable()
export class ApiKeyPostgresRepository
    extends DatabasePostgresRepositoryAbstract<ApiKeyEntity>
    implements IDatabaseRepository<ApiKeyEntity>
{
    constructor(
        @DatabaseModel(ApiKeyEntity.name)
        private readonly apiKeyModel: Repository<ApiKeyEntity>
    ) {
        super(apiKeyModel);
    }
}
