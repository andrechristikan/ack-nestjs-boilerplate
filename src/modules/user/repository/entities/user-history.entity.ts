import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { ENUM_USER_HISTORY_STATE } from 'src/modules/user/constants/user-history.enum.constant';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export const UserHistoryDatabaseName = 'userHistories';

@DatabaseEntity({ collection: UserHistoryDatabaseName })
export class UserHistoryEntity extends DatabaseMongoUUIDEntityAbstract {
    @Prop({
        required: true,
        index: true,
        trim: true,
        type: String,
        ref: UserEntity.name,
    })
    user: string;

    @Prop({
        required: true,
        type: String,
        enum: ENUM_USER_HISTORY_STATE,
    })
    beforeState: ENUM_USER_HISTORY_STATE;

    @Prop({
        required: true,
        type: String,
        enum: ENUM_USER_HISTORY_STATE,
    })
    afterState: ENUM_USER_HISTORY_STATE;

    @Prop({
        required: true,
        index: true,
        trim: true,
        type: String,
        ref: UserEntity.name,
    })
    by: string;
}

export const UserHistorySchema =
    SchemaFactory.createForClass(UserHistoryEntity);

export type UserHistoryDoc = UserHistoryEntity & Document;
