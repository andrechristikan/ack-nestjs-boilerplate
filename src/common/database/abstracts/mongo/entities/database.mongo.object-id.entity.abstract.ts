import { Prop } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { DatabaseBaseEntityAbstract } from 'src/common/database/abstracts/database.base-entity.abstract';
import {
    DATABASE_CREATED_AT_FIELD_NAME,
    DATABASE_DELETED_AT_FIELD_NAME,
    DATABASE_UPDATED_AT_FIELD_NAME,
} from 'src/common/database/constants/database.constant';
import { DatabaseDefaultObjectId } from 'src/common/database/constants/database.function.constant';

export abstract class DatabaseMongoObjectIdEntityAbstract extends DatabaseBaseEntityAbstract<Types.ObjectId> {
    @Prop({
        type: Types.ObjectId,
        default: DatabaseDefaultObjectId,
    })
    _id: Types.ObjectId;

    @Prop({
        required: false,
        index: true,
        type: Date,
    })
    [DATABASE_DELETED_AT_FIELD_NAME]?: Date;

    @Prop({
        required: false,
        index: 'asc',
        type: Date,
    })
    [DATABASE_CREATED_AT_FIELD_NAME]?: Date;

    @Prop({
        required: false,
        index: 'desc',
        type: Date,
    })
    [DATABASE_UPDATED_AT_FIELD_NAME]?: Date;
}
