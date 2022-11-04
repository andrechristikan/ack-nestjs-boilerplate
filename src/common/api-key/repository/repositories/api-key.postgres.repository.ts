import { Injectable } from '@nestjs/common';
import { ApiKeyEntity } from 'src/common/api-key/repository/entity/api-key.entity';
import { DatabasePostgresRepositoryAbstract } from 'src/common/database/abstracts/database.postgres-repository.abstract';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';

@Injectable()
export class ApiKeyPostgresRepository
    extends DatabasePostgresRepositoryAbstract<ApiKeyEntity>
    implements IDatabaseRepository<ApiKeyEntity> {
    // constructor(
    //     @DatabaseModel(ApiKeyPostgresSchema)
    //     private readonly apiKeyModel: Repository<ApiKeyEntity>
    // ) {
    //     super(apiKeyModel);
    // }
}
