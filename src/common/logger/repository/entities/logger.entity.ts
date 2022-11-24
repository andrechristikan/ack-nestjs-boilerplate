import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import {
    ENUM_LOGGER_ACTION,
    ENUM_LOGGER_LEVEL,
} from 'src/common/logger/constants/logger.enum.constant';
import { ENUM_REQUEST_METHOD } from 'src/common/request/constants/request.enum.constant';

export const LoggerDatabaseName = 'loggers';

@DatabaseEntity({ collection: LoggerDatabaseName })
export class LoggerEntity extends DatabaseMongoUUIDEntityAbstract {
    @Prop({
        required: true,
        enum: ENUM_LOGGER_LEVEL,
        type: String,
    })
    level: string;

    @Prop({
        required: true,
        enum: ENUM_LOGGER_ACTION,
        type: String,
    })
    action: string;

    @Prop({
        required: true,
        enum: ENUM_REQUEST_METHOD,
        type: String,
    })
    method: string;

    @Prop({
        required: false,
        type: String,
    })
    requestId?: string;

    @Prop({
        required: false,
        type: String,
    })
    user?: string;

    @Prop({
        required: false,
        type: String,
    })
    role?: string;

    @Prop({
        required: false,
        ref: ApiKeyEntity.name,
        type: String,
    })
    apiKey?: string;

    @Prop({
        required: true,
        default: true,
        type: Boolean,
    })
    anonymous: boolean;

    @Prop({
        required: false,
        enum: ENUM_AUTH_ACCESS_FOR,
        type: String,
    })
    accessFor?: ENUM_AUTH_ACCESS_FOR;

    @Prop({
        required: true,
        type: String,
    })
    description: string;

    @Prop({
        required: false,
        type: Object,
    })
    params?: Record<string, any>;

    @Prop({
        required: false,
        type: Object,
    })
    bodies?: Record<string, any>;

    @Prop({
        required: false,
        type: Number,
    })
    statusCode?: number;

    @Prop({
        required: false,
        type: String,
    })
    path?: string;

    @Prop({
        required: false,
        default: [],
        type: Array<string>,
    })
    tags: string[];
}

export const LoggerSchema = SchemaFactory.createForClass(LoggerEntity);
