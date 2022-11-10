import { ENUM_LOGGER_LEVEL } from 'src/common/logger/constants/logger.enum.constant';

export interface ILoggerOptions {
    description?: string;
    tags?: string[];
    level?: ENUM_LOGGER_LEVEL;
}
