import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';
import { ENUM_USER_HISTORY_STATE } from 'src/modules/user/constants/user-history.enum.constant';
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
        enum: ENUM_USER_HISTORY_STATE,
    })
    beforeState: ENUM_USER_HISTORY_STATE;

    @DatabaseProp({
        required: true,
        type: String,
        enum: ENUM_USER_HISTORY_STATE,
    })
    afterState: ENUM_USER_HISTORY_STATE;

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
