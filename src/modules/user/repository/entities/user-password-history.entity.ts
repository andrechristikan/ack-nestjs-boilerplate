import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';
import { ENUM_USER_PASSWORD_TYPE } from 'src/modules/user/constants/user.enum.constant';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export const UserPasswordHistoryTableName = 'UserPasswordHistories';

@DatabaseEntity({ collection: UserPasswordHistoryTableName })
export class UserPasswordHistoryEntity extends DatabaseMongoUUIDEntityAbstract {
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
    })
    password: string;

    @DatabaseProp({
        required: true,
        type: String,
        enum: ENUM_USER_PASSWORD_TYPE,
    })
    type: ENUM_USER_PASSWORD_TYPE;

    @DatabaseProp({
        required: true,
        index: true,
        trim: true,
        type: String,
        ref: UserEntity.name,
    })
    by: string;
}

export const UserPasswordHistorySchema = DatabaseSchema(
    UserPasswordHistoryEntity
);
export type UserPasswordHistoryDoc =
    IDatabaseDocument<UserPasswordHistoryEntity>;
