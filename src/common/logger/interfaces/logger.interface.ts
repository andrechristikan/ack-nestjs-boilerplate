import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { ENUM_LOGGER_LEVEL } from 'src/common/logger/constants/logger.enum.constant';

export interface ILoggerOptions {
    description?: string;
    tags?: string[];
    level?: ENUM_LOGGER_LEVEL;
}

export interface ILoggerEntity {
    level: string;
    action: string;
    method: string;
    requestId?: string;
    user?: string;
    role?: string;
    apiKey?: string;
    anonymous: boolean;
    accessFor?: ENUM_AUTH_ACCESS_FOR;
    description: string;
    params?: Record<string, any>;
    bodies?: Record<string, any>;
    statusCode?: number;
    path?: string;
    tags: string[];
}

export interface ILoggerJoinEntity extends Omit<ILoggerEntity, 'apiKey'> {
    apiKey?: IApiKeyEntity;
}
