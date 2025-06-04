import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { ENUM_API_KEY_TYPE } from '@module/api-key/enums/api-key.enum';
import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import { DatabaseUUIDEntityBase } from '@common/database/bases/database.uuid.entity';

export const ApiKeyTableName = 'ApiKeys';

@DatabaseEntity({ collection: ApiKeyTableName })
export class ApiKeyEntity extends DatabaseUUIDEntityBase {
    @DatabaseProp({
        required: true,
        enum: ENUM_API_KEY_TYPE,
        type: String,
        index: true,
        trim: true,
    })
    type: ENUM_API_KEY_TYPE;

    @DatabaseProp({
        required: true,
        index: true,
        type: String,
        minlength: 1,
        maxlength: 100,
        trim: true,
    })
    name: string;

    @DatabaseProp({
        required: true,
        type: String,
        unique: true,
        index: true,
        trim: true,
        maxlength: 50,
    })
    key: string;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
    })
    hash: string;

    @DatabaseProp({
        required: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;

    @DatabaseProp({
        required: false,
        type: Date,
    })
    startDate?: Date;

    @DatabaseProp({
        required: false,
        type: Date,
    })
    endDate?: Date;
}

export const ApiKeySchema = DatabaseSchema(ApiKeyEntity);
export type ApiKeyDoc = IDatabaseDocument<ApiKeyEntity>;
