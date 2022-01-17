import { LoggerEntity } from 'src/logger/logger.schema';
import { Document } from 'mongoose';
import { ENUM_LOGGER_ACTION } from './logger.constant';

export type LoggerDocument = LoggerEntity & Document;
export interface ILogger {
    action: ENUM_LOGGER_ACTION;
    description: string;
    user?: string;
    tags?: string[];
}
