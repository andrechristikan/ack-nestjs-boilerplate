import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    AuthApiDocument,
    AuthApiEntity,
} from 'src/common/auth/schemas/auth.api.schema';
import { DatabaseMongoBulkRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-bulk-repository.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { IDatabaseBulkRepositoryAbstract } from 'src/common/database/interfaces/database.bulk.repository.interface';

@Injectable()
export class AuthApiBulkRepository
    extends DatabaseMongoBulkRepositoryAbstract<AuthApiDocument>
    implements IDatabaseBulkRepositoryAbstract
{
    constructor(
        @DatabaseEntity(AuthApiEntity.name)
        private readonly authApiModel: Model<AuthApiDocument>
    ) {
        super(authApiModel);
    }
}
