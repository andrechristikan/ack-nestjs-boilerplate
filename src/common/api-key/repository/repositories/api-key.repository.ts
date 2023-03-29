import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    ApiKeyEntity,
    ApiKeyDoc,
} from 'src/common/api-key/repository/entities/api-key.entity';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/repositories/database.mongo.uuid.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';

@Injectable()
export class ApiKeyRepository extends DatabaseMongoUUIDRepositoryAbstract<
    ApiKeyEntity,
    ApiKeyDoc
> {
    constructor(
        @DatabaseModel(ApiKeyEntity.name)
        private readonly ApiKeyDoc: Model<ApiKeyEntity>
    ) {
        super(ApiKeyDoc);
    }
}
