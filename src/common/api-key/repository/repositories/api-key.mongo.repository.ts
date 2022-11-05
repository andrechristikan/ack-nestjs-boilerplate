import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { ApiKeyMongoEntity } from 'src/common/api-key/repository/entities/api-key.mongo.entity';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseMongoModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';

@Injectable()
export class ApiKeyMongoRepository
    extends DatabaseMongoRepositoryAbstract<ApiKeyMongoEntity>
    implements IDatabaseRepository<ApiKeyMongoEntity>
{
    constructor(
        @DatabaseMongoModel(ApiKeyMongoEntity)
        private readonly apiKeyModel: Model<ApiKeyMongoEntity>
    ) {
        super(apiKeyModel);
    }
}
