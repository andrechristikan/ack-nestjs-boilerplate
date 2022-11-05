import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { ApiKeyMongoEntity } from 'src/common/api-key/repository/entities/api-key.mongo.entity';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { DatabaseMongoEntityAbstract } from 'src/common/database/abstracts/database.mongo-entity.abstract';
import { DatabaseMongoSchema } from 'src/common/database/decorators/database.decorator';
import {
    ENUM_LOGGER_ACTION,
    ENUM_LOGGER_LEVEL,
} from 'src/common/logger/constants/logger.enum.constant';
import { LoggerDatabaseName } from 'src/common/logger/repository/entities/logger.entity';
import { ENUM_REQUEST_METHOD } from 'src/common/request/constants/request.enum.constant';

@DatabaseMongoSchema({ collection: LoggerDatabaseName })
export class LoggerMongoEntity extends DatabaseMongoEntityAbstract {
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
        ref: ApiKeyMongoEntity.name,
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

export const LoggerMongoSchema =
    SchemaFactory.createForClass(LoggerMongoEntity);