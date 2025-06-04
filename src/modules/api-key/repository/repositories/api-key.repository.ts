import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseUUIDRepositoryBase } from 'src/common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    ApiKeyDoc,
    ApiKeyEntity,
} from 'src/modules/api-key/repository/entities/api-key.entity';

@Injectable()
export class ApiKeyRepository extends DatabaseUUIDRepositoryBase<
    ApiKeyEntity,
    ApiKeyDoc
> {
    constructor(
        @InjectDatabaseModel(ApiKeyEntity.name)
        private readonly ApiKeyDoc: Model<ApiKeyEntity>
    ) {
        super(ApiKeyDoc);
    }
}
