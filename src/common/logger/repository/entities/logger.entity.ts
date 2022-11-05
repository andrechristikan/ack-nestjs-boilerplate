import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { DatabaseEntityAbstract } from 'src/common/database/abstracts/database.entity.repository';

export const LoggerDatabaseName = 'loggers';
export const LoggerRepository = 'LoggerRepositoryToken';

export class LoggerEntity extends DatabaseEntityAbstract {
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
