import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongooseBulkRepositoryAbstract } from 'src/common/database/abstracts/database.mongoose-bulk-repository.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { UserDocument, UserEntity } from 'src/modules/user/schemas/user.schema';

@Injectable()
export class UserBulkRepository extends DatabaseMongooseBulkRepositoryAbstract<UserDocument> {
    constructor(
        @DatabaseEntity(UserEntity.name)
        private readonly userModel: Model<UserDocument>
    ) {
        super(userModel);
    }
}
