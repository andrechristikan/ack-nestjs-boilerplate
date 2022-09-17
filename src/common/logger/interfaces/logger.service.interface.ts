import {
    ILogger,
    ILoggerRaw,
} from 'src/common/logger/interfaces/logger.interface';
import { LoggerDocument } from 'src/common/logger/schemas/logger.schema';

export interface ILoggerService {
    info(data: ILogger): Promise<LoggerDocument>;

    debug(data: ILogger): Promise<LoggerDocument>;

    warning(data: ILogger): Promise<LoggerDocument>;

    fatal(data: ILogger): Promise<LoggerDocument>;

    raw(data: ILoggerRaw): Promise<LoggerDocument>;
}
