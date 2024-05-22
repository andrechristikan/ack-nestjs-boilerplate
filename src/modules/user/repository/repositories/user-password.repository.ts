import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/repositories/database.mongo.uuid.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    UserPasswordDoc,
    UserPasswordEntity,
} from 'src/modules/user/repository/entities/user-password.entity';

@Injectable()
export class UserPasswordRepository extends DatabaseMongoUUIDRepositoryAbstract<
    UserPasswordEntity,
    UserPasswordDoc
> {
    constructor(
        @DatabaseModel(UserPasswordEntity.name)
        private readonly userPasswordModel: Model<UserPasswordEntity>
    ) {
        super(userPasswordModel);
    }
}
