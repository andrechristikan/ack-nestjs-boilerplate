import { SchemaFactory } from '@nestjs/mongoose';
import { ApiKeyPostgresEntity } from 'src/common/api-key/schemas/api-key.postgres.schema';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { DatabasePostgresEntity } from 'src/common/database/schemas/database.postgres.schema';
import {
    ENUM_LOGGER_ACTION,
    ENUM_LOGGER_LEVEL,
} from 'src/common/logger/constants/logger.enum.constant';
import { ILoggerEntity } from 'src/common/logger/interfaces/logger.interface';
import { ENUM_REQUEST_METHOD } from 'src/common/request/constants/request.enum.constant';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class LoggerPostgresEntity
    extends DatabasePostgresEntity
    implements ILoggerEntity
{
    @Column({
        nullable: false,
        enum: ENUM_LOGGER_LEVEL,
        type: String,
    })
    level: string;

    @Column({
        nullable: false,
        enum: ENUM_LOGGER_ACTION,
        type: String,
    })
    action: string;

    @Column({
        nullable: false,
        enum: ENUM_REQUEST_METHOD,
        type: String,
    })
    method: string;

    @Column({
        nullable: true,
        type: String,
    })
    requestId?: string;

    @Column({
        nullable: true,
        type: String,
    })
    user?: string;

    @Column({
        nullable: true,
        type: String,
    })
    role?: string;

    @ManyToOne(() => ApiKeyPostgresEntity, {
        cascade: true,
        lazy: true,
        eager: false,
    })
    @JoinColumn({ name: 'apiKey', referencedColumnName: '_id' })
    @Column({
        nullable: true,
        type: String,
    })
    apiKey?: string;

    @Column({
        nullable: false,
        default: true,
        type: Boolean,
    })
    anonymous: boolean;

    @Column({
        nullable: true,
        enum: ENUM_AUTH_ACCESS_FOR,
        type: String,
    })
    accessFor?: ENUM_AUTH_ACCESS_FOR;

    @Column({
        nullable: false,
        type: String,
    })
    description: string;

    @Column({
        nullable: true,
        type: 'json',
    })
    params?: Record<string, any>;

    @Column({
        nullable: true,
        type: 'json',
    })
    bodies?: Record<string, any>;

    @Column({
        nullable: true,
        type: Number,
    })
    statusCode?: number;

    @Column({
        nullable: true,
        type: String,
    })
    path?: string;

    @Column({
        nullable: true,
        default: [],
        type: 'array',
    })
    tags: string[];
}

export const LoggerPostgresSchema =
    SchemaFactory.createForClass(LoggerPostgresEntity);
