import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    ApiKey,
    ApiKeyEntity,
} from 'src/common/api-key/schemas/api-key.schema';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepositoryAbstract } from 'src/common/database/interfaces/database.repository.interface';

@Injectable()
export class ApiKeyRepository
    extends DatabaseMongoRepositoryAbstract<ApiKey>
    implements IDatabaseRepositoryAbstract<ApiKey>
{
    constructor(
        @DatabaseModel(ApiKeyEntity.name)
        private readonly apiKeyModel: Model<ApiKey>
    ) {
        super(apiKeyModel);
    }
}
