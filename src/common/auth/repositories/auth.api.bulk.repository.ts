import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    AuthApi,
    AuthApiEntity,
} from 'src/common/auth/schemas/auth.api.schema';
import { DatabaseMongoBulkRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-bulk-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseBulkRepositoryAbstract } from 'src/common/database/interfaces/database.bulk.repository.interface';

@Injectable()
export class AuthApiBulkRepository
    extends DatabaseMongoBulkRepositoryAbstract<AuthApi>
    implements IDatabaseBulkRepositoryAbstract
{
    constructor(
        @DatabaseModel(AuthApiEntity.name)
        private readonly authApiModel: Model<AuthApi>
    ) {
        super(authApiModel);
    }
}
