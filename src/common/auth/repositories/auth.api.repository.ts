import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    AuthApi,
    AuthApiEntity,
} from 'src/common/auth/schemas/auth.api.schema';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepositoryAbstract } from 'src/common/database/interfaces/database.repository.interface';
@Injectable()
export class AuthApiRepository
    extends DatabaseMongoRepositoryAbstract<AuthApi>
    implements IDatabaseRepositoryAbstract<AuthApi>
{
    constructor(
        @DatabaseModel(AuthApiEntity.name)
        private readonly authApiModel: Model<AuthApi>
    ) {
        super(authApiModel);
    }
}
