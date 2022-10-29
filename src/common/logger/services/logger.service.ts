import { Injectable } from '@nestjs/common';
import { ENUM_LOGGER_LEVEL } from 'src/common/logger/constants/logger.enum.constant';
import {
    ILogger,
    ILoggerRaw,
} from 'src/common/logger/interfaces/logger.interface';
import { ILoggerService } from 'src/common/logger/interfaces/logger.service.interface';
import { LoggerRepository } from 'src/common/logger/repositories/logger.repository';
import { Logger, LoggerEntity } from 'src/common/logger/schemas/logger.schema';

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
    }: ILogger): Promise<Logger> {
        const create: LoggerEntity = new LoggerEntity();
        create.level = ENUM_LOGGER_LEVEL.INFO;
        create.user = user;
        create.apiKey = apiKey;
        create.anonymous = user ? false : true;
        create.action = action;
        create.description = description;
        create.method = method;
        create.requestId = requestId;
        create.role = role ? role._id : undefined;
        create.accessFor = role && role.accessFor ? role.accessFor : undefined;
        create.params = params;
        create.bodies = bodies;
        create.path = path;
        create.statusCode = statusCode;
        create.tags = tags;

        return this.loggerRepository.create<LoggerEntity>(create);
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
    }: ILogger): Promise<Logger> {
        const create: LoggerEntity = new LoggerEntity();
        create.level = ENUM_LOGGER_LEVEL.DEBUG;
        create.user = user;
        create.apiKey = apiKey;
        create.anonymous = user ? false : true;
        create.action = action;
        create.description = description;
        create.method = method;
        create.requestId = requestId;
        create.role = role ? role._id : undefined;
        create.accessFor = role && role.accessFor ? role.accessFor : undefined;
        create.params = params;
        create.bodies = bodies;
        create.path = path;
        create.statusCode = statusCode;
        create.tags = tags;

        return this.loggerRepository.create<LoggerEntity>(create);
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
    }: ILogger): Promise<Logger> {
        const create: LoggerEntity = new LoggerEntity();
        create.level = ENUM_LOGGER_LEVEL.WARM;
        create.user = user;
        create.apiKey = apiKey;
        create.anonymous = user ? false : true;
        create.action = action;
        create.description = description;
        create.method = method;
        create.requestId = requestId;
        create.role = role ? role._id : undefined;
        create.accessFor = role && role.accessFor ? role.accessFor : undefined;
        create.params = params;
        create.bodies = bodies;
        create.path = path;
        create.statusCode = statusCode;
        create.tags = tags;

        return this.loggerRepository.create<LoggerEntity>(create);
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
    }: ILogger): Promise<Logger> {
        const create: LoggerEntity = new LoggerEntity();
        create.level = ENUM_LOGGER_LEVEL.FATAL;
        create.user = user;
        create.apiKey = apiKey;
        create.anonymous = user ? false : true;
        create.action = action;
        create.description = description;
        create.method = method;
        create.requestId = requestId;
        create.role = role ? role._id : undefined;
        create.accessFor = role && role.accessFor ? role.accessFor : undefined;
        create.params = params;
        create.bodies = bodies;
        create.path = path;
        create.statusCode = statusCode;
        create.tags = tags;

        return this.loggerRepository.create<LoggerEntity>(create);
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
    }: ILoggerRaw): Promise<Logger> {
        const create: LoggerEntity = new LoggerEntity();
        create.level = level;
        create.user = user;
        create.apiKey = apiKey;
        create.anonymous = user ? false : true;
        create.action = action;
        create.description = description;
        create.method = method;
        create.requestId = requestId;
        create.role = role ? role._id : undefined;
        create.accessFor = role && role.accessFor ? role.accessFor : undefined;
        create.params = params;
        create.bodies = bodies;
        create.path = path;
        create.statusCode = statusCode;
        create.tags = tags;

        return this.loggerRepository.create<LoggerEntity>(create);
    }
}
