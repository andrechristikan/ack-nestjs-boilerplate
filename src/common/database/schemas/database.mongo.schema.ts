import { Prop } from '@nestjs/mongoose';
import { DATABASE_DELETED_AT_FIELD_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';

export class DatabaseMongoEntity {
    @Prop({
        type: String,
        default: DatabaseDefaultUUID,
    })
    _id: string;

    @Prop({
        required: false,
        index: true,
        type: Date,
    })
    [DATABASE_DELETED_AT_FIELD_NAME]?: Date;
}
