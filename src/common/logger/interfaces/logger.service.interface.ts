import {
    ILogger,
    ILoggerRaw,
} from 'src/common/logger/interfaces/logger.interface';
import { Logger } from 'src/common/logger/schemas/logger.schema';

export interface ILoggerService {
    info(data: ILogger): Promise<Logger>;

    debug(data: ILogger): Promise<Logger>;

    warning(data: ILogger): Promise<Logger>;

    fatal(data: ILogger): Promise<Logger>;

    raw(data: ILoggerRaw): Promise<Logger>;
}
