import {
    LoggerCreateDto,
    LoggerCreateRawDto,
} from 'src/common/logger/dtos/logger.create.dto';
import { LoggerDoc } from 'src/common/logger/repository/entities/logger.entity';

export interface ILoggerService {
    info(data: LoggerCreateDto): Promise<LoggerDoc>;

    debug(data: LoggerCreateDto): Promise<LoggerDoc>;

    warn(data: LoggerCreateDto): Promise<LoggerDoc>;

    fatal(data: LoggerCreateDto): Promise<LoggerDoc>;

    raw(data: LoggerCreateRawDto): Promise<LoggerDoc>;
}
