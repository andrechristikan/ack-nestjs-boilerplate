import { LoggerOptions } from 'winston';

export interface IDebuggerOptionService {
    createLogger(): LoggerOptions;
}
