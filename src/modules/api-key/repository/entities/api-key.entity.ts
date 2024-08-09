import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';
import { DatabaseEntityAbstract } from 'src/common/database/abstracts/database.entity.abstract';

export const ApiKeyTableName = 'ApiKeys';

@DatabaseEntity({ collection: ApiKeyTableName })
export class ApiKeyEntity extends DatabaseEntityAbstract {
    @DatabaseProp({
        required: true,
        enum: ENUM_API_KEY_TYPE,
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
