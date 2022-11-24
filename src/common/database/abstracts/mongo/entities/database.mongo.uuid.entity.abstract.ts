import { Prop } from '@nestjs/mongoose';
import { DatabaseBaseEntityAbstract } from 'src/common/database/abstracts/database.base-entity.abstract';
import {
    DATABASE_CREATED_AT_FIELD_NAME,
    DATABASE_DELETED_AT_FIELD_NAME,
    DATABASE_UPDATED_AT_FIELD_NAME,
} from 'src/common/database/constants/database.constant';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
import { IDatabaseBaseEntity } from 'src/common/database/interfaces/database.entity.interface';

export abstract class DatabaseMongoUUIDEntityAbstract
    extends DatabaseBaseEntityAbstract
    implements IDatabaseBaseEntity<string>
{
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

    @Prop({
        required: false,
        index: true,
        type: Date,
    })
    [DATABASE_CREATED_AT_FIELD_NAME]?: Date;

    @Prop({
        required: false,
        index: true,
        type: Date,
    })
    [DATABASE_UPDATED_AT_FIELD_NAME]?: Date;
}
