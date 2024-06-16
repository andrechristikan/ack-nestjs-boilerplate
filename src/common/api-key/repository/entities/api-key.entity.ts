import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';

export const ApiKeyTableName = 'ApiKeys';

@DatabaseEntity({ collection: ApiKeyTableName })
export class ApiKeyEntity extends DatabaseMongoUUIDEntityAbstract {
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
        lowercase: true,
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
