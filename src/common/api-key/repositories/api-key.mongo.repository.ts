import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { ApiKeyEntity } from 'src/common/api-key/schemas/api-key.schema';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';

@Injectable()
export class ApiKeyMongoRepository
    extends DatabaseMongoRepositoryAbstract<ApiKeyEntity>
    implements IDatabaseRepository<ApiKeyEntity>
{
    constructor(
        @DatabaseModel(ApiKeyEntity.name)
        private readonly apiKeyModel: Model<ApiKeyEntity>
    ) {
        super(apiKeyModel);
    }
}
