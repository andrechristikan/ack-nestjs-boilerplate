import { ENUM_REQUEST_METHOD } from 'src/utils/request/request.constant';
import { ENUM_LOGGER_ACTION, ENUM_LOGGER_LEVEL } from './logger.constant';

export interface ILoggerRole {
    _id: string;
    isAdmin: boolean;
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
    requestParam?: Record<string, any>;
    requestBody?: Record<string, any>;
    responseStatus: number;
    responseStatusCode?: number;
}

export interface ILoggerOptions {
    description?: string;
    tags?: string[];
    level?: ENUM_LOGGER_LEVEL;
}
