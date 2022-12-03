import { Injectable } from '@nestjs/common';
import { ENUM_LOGGER_LEVEL } from 'src/common/logger/constants/logger.enum.constant';
import {
    LoggerCreateDto,
    LoggerCreateRawDto,
} from 'src/common/logger/dtos/logger.create.dto';
import { ILoggerService } from 'src/common/logger/interfaces/logger.service.interface';
import { LoggerEntity } from 'src/common/logger/repository/entities/logger.entity';
import { LoggerRepository } from 'src/common/logger/repository/repositories/logger.repository';

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
        accessFor,
        params,
        bodies,
        path,
        statusCode,
        tags,
    }: LoggerCreateDto): Promise<LoggerEntity> {
        const create: LoggerEntity = new LoggerEntity();
        create.level = ENUM_LOGGER_LEVEL.INFO;
        create.user = user;
        create.apiKey = apiKey;
        create.anonymous = !user;
        create.action = action;
        create.description = description;
        create.method = method;
        create.requestId = requestId;
        create.role = role;
        create.accessFor = accessFor;
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
        accessFor,
        params,
        bodies,
        path,
        statusCode,
        tags,
    }: LoggerCreateDto): Promise<LoggerEntity> {
        const create: LoggerEntity = new LoggerEntity();
        create.level = ENUM_LOGGER_LEVEL.DEBUG;
        create.user = user;
        create.apiKey = apiKey;
        create.anonymous = !user;
        create.action = action;
        create.description = description;
        create.method = method;
        create.requestId = requestId;
        create.role = role;
        create.accessFor = accessFor;
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
        accessFor,
        params,
        bodies,
        path,
        statusCode,
        tags,
    }: LoggerCreateDto): Promise<LoggerEntity> {
        const create: LoggerEntity = new LoggerEntity();
        create.level = ENUM_LOGGER_LEVEL.WARM;
        create.user = user;
        create.apiKey = apiKey;
        create.anonymous = !user;
        create.action = action;
        create.description = description;
        create.method = method;
        create.requestId = requestId;
        create.role = role;
        create.accessFor = accessFor;
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
        accessFor,
        params,
        bodies,
        path,
        statusCode,
        tags,
    }: LoggerCreateDto): Promise<LoggerEntity> {
        const create: LoggerEntity = new LoggerEntity();
        create.level = ENUM_LOGGER_LEVEL.FATAL;
        create.user = user;
        create.apiKey = apiKey;
        create.anonymous = !user;
        create.action = action;
        create.description = description;
        create.method = method;
        create.requestId = requestId;
        create.role = role;
        create.accessFor = accessFor;
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
        accessFor,
        params,
        bodies,
        path,
        statusCode,
        tags,
    }: LoggerCreateRawDto): Promise<LoggerEntity> {
        const create: LoggerEntity = new LoggerEntity();
        create.level = level;
        create.user = user;
        create.apiKey = apiKey;
        create.anonymous = !user;
        create.action = action;
        create.description = description;
        create.method = method;
        create.requestId = requestId;
        create.role = role;
        create.accessFor = accessFor;
        create.params = params;
        create.bodies = bodies;
        create.path = path;
        create.statusCode = statusCode;
        create.tags = tags;

        return this.loggerRepository.create<LoggerEntity>(create);
    }
}
