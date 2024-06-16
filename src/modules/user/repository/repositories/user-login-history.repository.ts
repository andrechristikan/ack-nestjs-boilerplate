import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/repositories/database.mongo.uuid.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    UserLoginHistoryDoc,
    UserLoginHistoryEntity,
} from 'src/modules/user/repository/entities/user-login-history.entity';

@Injectable()
export class UserLoginHistoryRepository extends DatabaseMongoUUIDRepositoryAbstract<
    UserLoginHistoryEntity,
    UserLoginHistoryDoc
> {
    constructor(
        @DatabaseModel(UserLoginHistoryEntity.name)
        private readonly userLoginHistoryModel: Model<UserLoginHistoryEntity>
    ) {
        super(userLoginHistoryModel);
    }
}
