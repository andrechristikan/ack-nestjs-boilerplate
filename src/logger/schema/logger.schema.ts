import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AuthApiEntity } from 'src/auth/schema/auth.api.schema';
import { ENUM_REQUEST_METHOD } from 'src/utils/request/request.constant';
import { ENUM_LOGGER_ACTION, ENUM_LOGGER_LEVEL } from '../logger.constant';

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
        ref: AuthApiEntity.name,
    })
    apiKey?: Types.ObjectId;

    @Prop({
        required: true,
        default: true,
    })
    anonymous: boolean;

    @Prop({
        required: true,
    })
    description: string;

    @Prop({
        required: false,
        default: [],
    })
    tags: string[];
}

export const LoggerDatabaseName = 'loggers';
export const LoggerSchema = SchemaFactory.createForClass(LoggerEntity);

export type LoggerDocument = LoggerEntity & Document;
