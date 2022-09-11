import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    AuthApiDocument,
    AuthApiEntity,
} from 'src/common/auth/schemas/auth.api.schema';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepositoryAbstract } from 'src/common/database/interfaces/database.repository.interface';
@Injectable()
export class AuthApiRepository
    extends DatabaseMongoRepositoryAbstract<AuthApiDocument>
    implements IDatabaseRepositoryAbstract<AuthApiDocument>
{
    constructor(
        @DatabaseEntity(AuthApiEntity.name)
        private readonly authApiModel: Model<AuthApiDocument>
    ) {
        super(authApiModel);
    }
}
