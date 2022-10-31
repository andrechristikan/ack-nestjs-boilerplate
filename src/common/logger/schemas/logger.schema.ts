import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { DatabaseEntity } from 'src/common/database/schemas/database.schema';
import { ILoggerEntity } from 'src/common/logger/interfaces/logger.interface';

export class LoggerEntity extends DatabaseEntity implements ILoggerEntity {
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

export const LoggerDatabaseName = 'loggers';
