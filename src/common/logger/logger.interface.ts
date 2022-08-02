import { ENUM_AUTH_ACCESS_FOR } from '../auth/constants/auth.constant';
import { ENUM_REQUEST_METHOD } from '../request/constants/request.constant';
import {
    ENUM_LOGGER_ACTION,
    ENUM_LOGGER_LEVEL,
} from './constants/logger.constant';

export interface ILogger {
    action: ENUM_LOGGER_ACTION;
    description: string;
    apiKey?: string;
    user?: string;
    requestId?: string;
    method: ENUM_REQUEST_METHOD;
    role?: {
        _id: string;
        accessFor: ENUM_AUTH_ACCESS_FOR;
    };
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
