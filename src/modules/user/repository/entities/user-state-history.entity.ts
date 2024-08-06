import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export const UserStateHistoryTableName = 'UserStateHistories';

@DatabaseEntity({ collection: UserStateHistoryTableName })
export class UserStateHistoryEntity extends DatabaseMongoUUIDEntityAbstract {
    @DatabaseProp({
        required: true,
        index: true,
        trim: true,
        type: String,
        ref: UserEntity.name,
    })
    user: string;

    @DatabaseProp({
        required: true,
        type: String,
        enum: ENUM_USER_STATUS,
    })
    beforeState: ENUM_USER_STATUS;

    @DatabaseProp({
        required: true,
        type: String,
        enum: ENUM_USER_STATUS,
    })
    afterState: ENUM_USER_STATUS;

    @DatabaseProp({
        required: true,
        index: true,
        trim: true,
        type: String,
        ref: UserEntity.name,
    })
    by: string;
}

export const UserStateHistorySchema = DatabaseSchema(UserStateHistoryEntity);
export type UserStateHistoryDoc = IDatabaseDocument<UserStateHistoryEntity>;
