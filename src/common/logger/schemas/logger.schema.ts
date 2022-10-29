import { ApiKeyEntity } from 'src/common/api-key/schemas/api-key.schema';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import {
    DatabaseEntity,
    DatabasePropForeign,
    DatabaseProp,
    DatabasePropPrimary,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseSchema } from 'src/common/database/interfaces/database.interface';
import {
    ENUM_LOGGER_ACTION,
    ENUM_LOGGER_LEVEL,
} from 'src/common/logger/constants/logger.enum.constant';
import { ENUM_REQUEST_METHOD } from 'src/common/request/constants/request.enum.constant';

@DatabaseEntity()
export class LoggerEntity {
    @DatabasePropPrimary()
    _id?: string;

    @DatabaseProp({
        required: true,
        enum: ENUM_LOGGER_LEVEL,
        type: String,
    })
    level: string;

    @DatabaseProp({
        required: true,
        enum: ENUM_LOGGER_ACTION,
        type: String,
    })
    action: string;

    @DatabaseProp({
        required: true,
        enum: ENUM_REQUEST_METHOD,
        type: String,
    })
    method: string;

    @DatabaseProp({
        required: false,
        type: String,
    })
    requestId?: string;

    @DatabasePropForeign({
        required: false,
        type: String,
    })
    user?: string;

    @DatabasePropForeign({
        required: false,
        type: String,
    })
    role?: string;

    @DatabasePropForeign({
        required: false,
        ref: ApiKeyEntity.name,
        type: String,
    })
    apiKey?: string;

    @DatabaseProp({
        required: true,
        default: true,
        type: Boolean,
    })
    anonymous: boolean;

    @DatabaseProp({
        required: false,
        enum: ENUM_AUTH_ACCESS_FOR,
        type: String,
    })
    accessFor?: ENUM_AUTH_ACCESS_FOR;

    @DatabaseProp({
        required: true,
        type: String,
    })
    description: string;

    @DatabaseProp({
        required: false,
        type: Object,
    })
    params?: Record<string, any>;

    @DatabaseProp({
        required: false,
        type: Object,
    })
    bodies?: Record<string, any>;

    @DatabaseProp({
        required: false,
        type: Number,
    })
    statusCode?: number;

    @DatabaseProp({
        required: false,
        type: String,
    })
    path?: string;

    @DatabaseProp({
        required: false,
        default: [],
        type: Array<string>,
    })
    tags: string[];
}

export const LoggerDatabaseName = 'loggers';

export const LoggerSchema = DatabaseSchema(LoggerEntity);
export type Logger = IDatabaseSchema<LoggerEntity>;
