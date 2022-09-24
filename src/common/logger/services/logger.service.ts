import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ENUM_LOGGER_LEVEL } from 'src/common/logger/constants/logger.enum.constant';
import {
    ILogger,
    ILoggerRaw,
} from 'src/common/logger/interfaces/logger.interface';
import { ILoggerService } from 'src/common/logger/interfaces/logger.service.interface';
import { LoggerRepository } from 'src/common/logger/repositories/logger.repository';
import {
    LoggerDocument,
    LoggerEntity,
} from 'src/common/logger/schemas/logger.schema';

@Injectable()
export class LoggerService implements ILoggerService {
    constructor(private readonly loggerRepository: LoggerRepository) {}

    async info({
        action,
        description,
        apiKey,
        user,
        method,
        requestId,
        role,
        params,
        bodies,
        path,
        statusCode,
        tags,
    }: ILogger): Promise<LoggerDocument> {
        const create: LoggerEntity = {
            level: ENUM_LOGGER_LEVEL.INFO,
            user: user ? new Types.ObjectId(user) : undefined,
            apiKey: apiKey ? new Types.ObjectId(apiKey) : undefined,
            anonymous: user ? false : true,
            action,
            description,
            method,
            requestId,
            role: role ? new Types.ObjectId(role._id) : undefined,
            accessFor: role && role.accessFor ? role.accessFor : undefined,
            params,
            bodies,
            path,
            statusCode,
            tags,
        };

        return this.loggerRepository.create(create);
    }

    async debug({
        action,
        description,
        apiKey,
        user,
        method,
        requestId,
        role,
        params,
        bodies,
        path,
        statusCode,
        tags,
    }: ILogger): Promise<LoggerDocument> {
        const create: LoggerEntity = {
            level: ENUM_LOGGER_LEVEL.DEBUG,
            user: user ? new Types.ObjectId(user) : undefined,
            apiKey: apiKey ? new Types.ObjectId(apiKey) : undefined,
            anonymous: user ? false : true,
            action,
            description,
            method,
            requestId,
            role: role ? new Types.ObjectId(role._id) : undefined,
            accessFor: role && role.accessFor ? role.accessFor : undefined,
            params,
            bodies,
            path,
            statusCode,
            tags,
        };

        return this.loggerRepository.create(create);
    }

    async warning({
        action,
        description,
        apiKey,
        user,
        method,
        requestId,
        role,
        params,
        bodies,
        path,
        statusCode,
        tags,
    }: ILogger): Promise<LoggerDocument> {
        const create: LoggerEntity = {
            level: ENUM_LOGGER_LEVEL.WARM,
            user: user ? new Types.ObjectId(user) : undefined,
            apiKey: apiKey ? new Types.ObjectId(apiKey) : undefined,
            anonymous: user ? false : true,
            action,
            description,
            method,
            requestId,
            role: role ? new Types.ObjectId(role._id) : undefined,
            accessFor: role && role.accessFor ? role.accessFor : undefined,
            params,
            bodies,
            path,
            statusCode,
            tags,
        };

        return this.loggerRepository.create(create);
    }

    async fatal({
        action,
        description,
        apiKey,
        user,
        method,
        requestId,
        role,
        params,
        bodies,
        path,
        statusCode,
        tags,
    }: ILogger): Promise<LoggerDocument> {
        const create: LoggerEntity = {
            level: ENUM_LOGGER_LEVEL.FATAL,
            user: user ? new Types.ObjectId(user) : undefined,
            apiKey: apiKey ? new Types.ObjectId(apiKey) : undefined,
            anonymous: user ? false : true,
            action,
            description,
            method,
            requestId,
            role: role ? new Types.ObjectId(role._id) : undefined,
            accessFor: role && role.accessFor ? role.accessFor : undefined,
            params,
            bodies,
            path,
            statusCode,
            tags,
        };

        return this.loggerRepository.create(create);
    }

    async raw({
        level,
        action,
        description,
        apiKey,
        user,
        method,
        requestId,
        role,
        params,
        bodies,
        path,
        statusCode,
        tags,
    }: ILoggerRaw): Promise<LoggerDocument> {
        const create: LoggerEntity = {
            level,
            user: user ? new Types.ObjectId(user) : undefined,
            apiKey: apiKey ? new Types.ObjectId(apiKey) : undefined,
            anonymous: user ? false : true,
            action,
            description,
            method,
            requestId,
            role: role ? new Types.ObjectId(role._id) : undefined,
            accessFor: role && role.accessFor ? role.accessFor : undefined,
            params,
            bodies,
            path,
            statusCode,
            tags,
        };

        return this.loggerRepository.create(create);
    }
}
