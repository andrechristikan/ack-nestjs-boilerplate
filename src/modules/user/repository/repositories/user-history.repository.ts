import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/repositories/database.mongo.uuid.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    UserHistoryDoc,
    UserHistoryEntity,
} from 'src/modules/user/repository/entities/user-history.entity';

@Injectable()
export class UserHistoryRepository extends DatabaseMongoUUIDRepositoryAbstract<
    UserHistoryEntity,
    UserHistoryDoc
> {
    constructor(
        @DatabaseModel(UserHistoryEntity.name)
        private readonly userHistoryModel: Model<UserHistoryEntity>
    ) {
        super(userHistoryModel);
    }
}
