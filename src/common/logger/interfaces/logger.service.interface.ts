import {
    LoggerCreateDto,
    LoggerCreateRawDto,
} from 'src/common/logger/dtos/logger.create.dto';
import { LoggerEntity } from 'src/common/logger/schemas/logger.schema';

export interface ILoggerService {
    info(data: LoggerCreateDto): Promise<LoggerEntity>;

    debug(data: LoggerCreateDto): Promise<LoggerEntity>;

    warning(data: LoggerCreateDto): Promise<LoggerEntity>;

    fatal(data: LoggerCreateDto): Promise<LoggerEntity>;

    raw(data: LoggerCreateRawDto): Promise<LoggerEntity>;
}
