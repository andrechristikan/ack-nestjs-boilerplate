import { DatabaseEntityBase } from '@common/database/bases/database.entity';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { ENUM_API_KEY_TYPE } from '@modules/api-key/enums/api-key.enum';

export const ApiKeyTableName = 'ApiKeys';

@DatabaseEntity({ collection: ApiKeyTableName })
export class ApiKeyEntity extends DatabaseEntityBase {
    @DatabaseProp({
        required: true,
        enum: ENUM_API_KEY_TYPE,
        type: String,
        index: true,
        trim: true,
    })
    type: ENUM_API_KEY_TYPE;

    @DatabaseProp({
        required: false,
        type: String,
        maxlength: 100,
        trim: true,
    })
    description?: string;

    @DatabaseProp({
        required: true,
        type: String,
        unique: true,
        index: true,
        trim: true,
        maxlength: 50,
        minlength: 50,
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
        default: true,
        type: Boolean,
    })
    isActive: boolean;

    @DatabaseProp({
        required: false,
        index: true,
        sparse: true,
        type: Date,
    })
    startDate?: Date;

    @DatabaseProp({
        required: false,
        index: true,
        sparse: true,
        type: Date,
    })
    endDate?: Date;
}

export const ApiKeySchema = DatabaseSchema(ApiKeyEntity);
