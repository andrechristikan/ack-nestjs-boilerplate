import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/repositories/database.mongo.uuid.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    ApiKeyDoc,
    ApiKeyEntity,
} from 'src/modules/api-key/repository/entities/api-key.entity';

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
