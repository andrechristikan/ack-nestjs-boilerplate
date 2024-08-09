import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseRepositoryAbstract } from 'src/common/database/abstracts/database.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    ApiKeyDoc,
    ApiKeyEntity,
} from 'src/modules/api-key/repository/entities/api-key.entity';

@Injectable()
export class ApiKeyRepository extends DatabaseRepositoryAbstract<
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
