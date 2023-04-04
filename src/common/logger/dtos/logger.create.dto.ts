import {
    ENUM_LOGGER_ACTION,
    ENUM_LOGGER_LEVEL,
} from 'src/common/logger/constants/logger.enum.constant';
import { ENUM_REQUEST_METHOD } from 'src/common/request/constants/request.enum.constant';
import { ENUM_ROLE_TYPE } from 'src/common/role/constants/role.enum.constant';

export class LoggerCreateDto {
    action: ENUM_LOGGER_ACTION;
    description: string;
    apiKey?: string;
    user?: string;
    requestId?: string;
    method: ENUM_REQUEST_METHOD;
    path: string;
    role?: string;
    type?: ENUM_ROLE_TYPE;
    tags?: string[];
    params?: Record<string, any>;
    bodies?: Record<string, any>;
    statusCode?: number;
}

export class LoggerCreateRawDto extends LoggerCreateDto {
    level: ENUM_LOGGER_LEVEL;
}
