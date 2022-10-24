import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoBulkRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-bulk-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseBulkRepositoryAbstract } from 'src/common/database/interfaces/database.bulk.repository.interface';
import { User, UserEntity } from 'src/modules/user/schemas/user.schema';

@Injectable()
export class UserBulkRepository
    extends DatabaseMongoBulkRepositoryAbstract<User>
    implements IDatabaseBulkRepositoryAbstract
{
    constructor(
        @DatabaseModel(UserEntity.name)
        private readonly userModel: Model<User>
    ) {
        super(userModel);
    }
}
