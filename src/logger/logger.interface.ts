import { RoleDocument } from 'src/role/schema/role.schema';
import { ENUM_REQUEST_METHOD } from 'src/utils/request/request.constant';
import { ENUM_LOGGER_ACTION, ENUM_LOGGER_LEVEL } from './logger.constant';
export interface ILogger {
    action: ENUM_LOGGER_ACTION;
    description: string;
    apiKey?: string;
    user?: string;
    requestId?: string;
    method: ENUM_REQUEST_METHOD;
    role?: RoleDocument;
    tags: string[];
}

export interface ILoggerOptions {
    description?: string;
    tags?: string[];
    level?: ENUM_LOGGER_LEVEL;
}
