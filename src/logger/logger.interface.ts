import { ENUM_ROLE_ACCESS_FOR } from 'src/role/role.constant';
import { ENUM_REQUEST_METHOD } from 'src/utils/request/request.constant';
import { ENUM_LOGGER_ACTION, ENUM_LOGGER_LEVEL } from './logger.constant';

export interface ILoggerRole {
    _id: string;
    accessFor: ENUM_ROLE_ACCESS_FOR;
}

export interface ILogger {
    action: ENUM_LOGGER_ACTION;
    description: string;
    apiKey?: string;
    user?: string;
    requestId?: string;
    method: ENUM_REQUEST_METHOD;
    role?: ILoggerRole;
    tags?: string[];
    params?: Record<string, any>;
    bodies?: Record<string, any>;
    statusCode?: number;
}

export interface ILoggerOptions {
    description?: string;
    tags?: string[];
    level?: ENUM_LOGGER_LEVEL;
}
