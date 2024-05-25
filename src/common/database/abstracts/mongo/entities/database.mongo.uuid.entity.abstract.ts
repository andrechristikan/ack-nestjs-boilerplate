import { DatabaseEntityAbstract } from 'src/common/database/abstracts/base/database.entity.abstract';
import {
    DATABASE_CREATED_AT_FIELD_NAME,
    DATABASE_DELETED_AT_FIELD_NAME,
    DATABASE_UPDATED_AT_FIELD_NAME,
} from 'src/common/database/constants/database.constant';
import { DatabaseProp } from 'src/common/database/decorators/database.decorator';
import { v4 as uuidV4 } from 'uuid';
export abstract class DatabaseMongoUUIDEntityAbstract extends DatabaseEntityAbstract<string> {
    @DatabaseProp({
        type: String,
        default: uuidV4,
    })
    _id: string;

    @DatabaseProp({
        required: false,
        index: true,
        type: Date,
    })
    [DATABASE_DELETED_AT_FIELD_NAME]?: Date;

    @DatabaseProp({
        required: false,
        index: 'asc',
        type: Date,
        default: new Date(),
    })
    [DATABASE_CREATED_AT_FIELD_NAME]?: Date;

    @DatabaseProp({
        required: false,
        index: 'asc',
        type: Date,
        default: new Date(),
    })
    [DATABASE_UPDATED_AT_FIELD_NAME]?: Date;
}
