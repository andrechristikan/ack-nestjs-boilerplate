import { ENUM_LOGGER_ACTION } from './logger.constant';
export interface ILogger {
    action: ENUM_LOGGER_ACTION;
    description: string;
    user?: string;
    tags?: string[];
}
