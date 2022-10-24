import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { AuthApiEntity } from 'src/common/auth/schemas/auth.api.schema';
import {
    DatabaseEntity,
    DatabasePropForeign,
    DatabaseProp,
    DatabasePropPrimary,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import {
    DatabasePrimaryKeyType,
    DatabaseSchemaType,
} from 'src/common/database/interfaces/database.interface';
import {
    ENUM_LOGGER_ACTION,
    ENUM_LOGGER_LEVEL,
} from 'src/common/logger/constants/logger.enum.constant';
import { ENUM_REQUEST_METHOD } from 'src/common/request/constants/request.enum.constant';

@DatabaseEntity({ timestamps: true, versionKey: false })
export class LoggerEntity {
    @DatabasePropPrimary()
    _id?: DatabasePrimaryKeyType;

    @DatabaseProp({
        required: true,
        enum: ENUM_LOGGER_LEVEL,
    })
    level: string;

    @DatabaseProp({
        required: true,
        enum: ENUM_LOGGER_ACTION,
    })
    action: string;

    @DatabaseProp({
        required: true,
        enum: ENUM_REQUEST_METHOD,
    })
    method: string;

    @DatabaseProp({
        required: false,
    })
    requestId?: string;

    @DatabasePropForeign({
        required: false,
    })
    user?: DatabasePrimaryKeyType;

    @DatabasePropForeign({
        required: false,
    })
    role?: DatabasePrimaryKeyType;

    @DatabasePropForeign({
        required: false,
        ref: AuthApiEntity.name,
    })
    apiKey?: DatabasePrimaryKeyType;

    @DatabaseProp({
        required: true,
        default: true,
    })
    anonymous: boolean;

    @DatabaseProp({
        required: false,
        enum: ENUM_AUTH_ACCESS_FOR,
    })
    accessFor?: ENUM_AUTH_ACCESS_FOR;

    @DatabaseProp({
        required: true,
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
    })
    statusCode?: number;

    @DatabaseProp({
        required: false,
    })
    path?: string;

    @DatabaseProp({
        required: false,
        default: [],
    })
    tags: string[];
}

export const LoggerDatabaseName = 'loggers';

export const Logger = DatabaseSchema(LoggerEntity);
export type Logger = DatabaseSchemaType<LoggerEntity>;
