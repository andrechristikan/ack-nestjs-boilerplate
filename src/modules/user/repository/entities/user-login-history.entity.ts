import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export const UserLoginHistoryTableName = 'UserLoginHistories';

@DatabaseEntity({ collection: UserLoginHistoryTableName })
export class UserLoginHistoryEntity extends DatabaseMongoUUIDEntityAbstract {
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
        trim: true,
        type: String,
    })
    ip: string;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
    })
    hostname: string;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
    })
    protocol: string;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
    })
    originalUrl: string;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
    })
    method: string;

    @DatabaseProp({
        required: false,
        trim: true,
        type: String,
    })
    userAgent?: string;

    @DatabaseProp({
        required: false,
        trim: true,
        type: String,
    })
    xForwardedFor?: string;

    @DatabaseProp({
        required: false,
        trim: true,
        type: String,
    })
    xForwardedHost?: string;

    @DatabaseProp({
        required: false,
        trim: true,
        type: String,
    })
    xForwardedPorto?: string;
}

export const UserLoginHistorySchema = DatabaseSchema(UserLoginHistoryEntity);
export type UserLoginHistoryDoc = IDatabaseDocument<UserLoginHistoryEntity>;
