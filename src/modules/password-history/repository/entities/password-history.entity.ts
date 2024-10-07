import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export const PasswordHistoryTableName = 'PasswordHistories';

@DatabaseEntity({ collection: PasswordHistoryTableName })
export class PasswordHistoryEntity extends DatabaseEntityBase {
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
        enum: ENUM_PASSWORD_HISTORY_TYPE,
    })
    type: ENUM_PASSWORD_HISTORY_TYPE;

    @DatabaseProp({
        required: true,
        type: Date,
    })
    expiredAt: Date;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
        ref: UserEntity.name,
    })
    by: string;
}

export const PasswordHistorySchema = DatabaseSchema(PasswordHistoryEntity);
export type PasswordHistoryDoc = IDatabaseDocument<PasswordHistoryEntity>;
