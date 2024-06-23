import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/repositories/database.mongo.uuid.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    UserPasswordHistoryDoc,
    UserPasswordHistoryEntity,
} from 'src/modules/user/repository/entities/user-password-history.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class UserPasswordHistoryRepository extends DatabaseMongoUUIDRepositoryAbstract<
    UserPasswordHistoryEntity,
    UserPasswordHistoryDoc
> {
    constructor(
        @DatabaseModel(UserPasswordHistoryEntity.name)
        private readonly userPasswordHistoryModel: Model<UserPasswordHistoryEntity>
    ) {
        super(userPasswordHistoryModel, {
            field: 'by',
            localKey: 'by',
            foreignKey: '_id',
            model: UserEntity.name,
            justOne: true,
        });
    }
}
