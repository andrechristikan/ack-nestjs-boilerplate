import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ENUM_LOGGER_ACTION, ENUM_LOGGER_LEVEL } from './logger.constant';
import { LoggerEntity } from './logger.schema';
import { LoggerDocument } from './logger.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService {
    private readonly testMode: boolean;

    constructor(
        @InjectModel(LoggerEntity.name)
        private readonly loggerModel: Model<LoggerDocument>,
        private readonly configService: ConfigService
    ) {
        this.testMode = this.configService.get<string>('app.env') !== 'testing';
    }

    async info(
        action: ENUM_LOGGER_ACTION,
        description: string,
        user?: string,
        tags?: string[]
    ): Promise<LoggerDocument> {
        if (this.testMode) {
            return;
        }

        return this.loggerModel.create({
            level: ENUM_LOGGER_LEVEL.INFO,
            user: new Types.ObjectId(user),
            anonymous: user ? false : true,
            action,
            description,
            tags
        });
    }

    async debug(
        action: ENUM_LOGGER_ACTION,
        description: string,
        user?: string,
        tags?: string[]
    ): Promise<LoggerDocument> {
        if (this.testMode) {
            return;
        }

        return this.loggerModel.create({
            level: ENUM_LOGGER_LEVEL.DEBUG,
            user: new Types.ObjectId(user),
            anonymous: user ? false : true,
            action,
            description,
            tags
        });
    }

    async warning(
        action: ENUM_LOGGER_ACTION,
        description: string,
        user?: string,
        tags?: string[]
    ): Promise<LoggerDocument> {
        if (this.testMode) {
            return;
        }

        return this.loggerModel.create({
            level: ENUM_LOGGER_LEVEL.WARM,
            user: new Types.ObjectId(user),
            anonymous: user ? false : true,
            action,
            description,
            tags
        });
    }

    async fatal(
        action: ENUM_LOGGER_ACTION,
        description: string,
        user?: string,
        tags?: string[]
    ): Promise<LoggerDocument> {
        if (this.testMode) {
            return;
        }

        return this.loggerModel.create({
            level: ENUM_LOGGER_LEVEL.FATAL,
            user: new Types.ObjectId(user),
            anonymous: user ? false : true,
            action,
            description,
            tags
        });
    }
}
