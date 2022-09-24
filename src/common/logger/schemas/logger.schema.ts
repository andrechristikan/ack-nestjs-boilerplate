import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { AuthApiEntity } from 'src/common/auth/schemas/auth.api.schema';
import {
    ENUM_LOGGER_ACTION,
    ENUM_LOGGER_LEVEL,
} from 'src/common/logger/constants/logger.enum.constant';
import { ENUM_REQUEST_METHOD } from 'src/common/request/constants/request.enum.constant';

@Schema({ timestamps: true, versionKey: false })
export class LoggerEntity {
    @Prop({
        required: true,
        enum: ENUM_LOGGER_LEVEL,
    })
    level: string;

    @Prop({
        required: true,
        enum: ENUM_LOGGER_ACTION,
    })
    action: string;

    @Prop({
        required: true,
        enum: ENUM_REQUEST_METHOD,
    })
    method: string;

    @Prop({
        required: false,
    })
    requestId?: string;

    @Prop({
        required: false,
    })
    user?: Types.ObjectId;

    @Prop({
        required: false,
    })
    role?: Types.ObjectId;

    @Prop({
        required: false,
        ref: AuthApiEntity.name,
    })
    apiKey?: Types.ObjectId;

    @Prop({
        required: true,
        default: true,
    })
    anonymous: boolean;

    @Prop({
        required: false,
        enum: ENUM_AUTH_ACCESS_FOR,
    })
    accessFor?: ENUM_AUTH_ACCESS_FOR;

    @Prop({
        required: true,
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
    })
    statusCode?: number;

    @Prop({
        required: false,
    })
    path?: string;

    @Prop({
        required: false,
        default: [],
    })
    tags: string[];
}

export const LoggerDatabaseName = 'loggers';
export const LoggerSchema = SchemaFactory.createForClass(LoggerEntity);

export type LoggerDocument = LoggerEntity & Document;
