import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/repositories/database.mongo.uuid.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    UserStateHistoryDoc,
    UserStateHistoryEntity,
} from 'src/modules/user/repository/entities/user-state-history.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class UserStateHistoryRepository extends DatabaseMongoUUIDRepositoryAbstract<
    UserStateHistoryEntity,
    UserStateHistoryDoc
> {
    constructor(
        @DatabaseModel(UserStateHistoryEntity.name)
        private readonly userStateHistoryModel: Model<UserStateHistoryEntity>
    ) {
        super(userStateHistoryModel, {
            field: 'by',
            localKey: 'by',
            foreignKey: '_id',
            model: UserEntity.name,
            justOne: true,
        });
    }
}
