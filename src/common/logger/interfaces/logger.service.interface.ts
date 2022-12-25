import {
    LoggerCreateDto,
    LoggerCreateRawDto,
} from 'src/common/logger/dtos/logger.create.dto';
import { LoggerEntity } from 'src/common/logger/repository/entities/logger.entity';

export interface ILoggerService {
    info(data: LoggerCreateDto): Promise<LoggerEntity>;

    debug(data: LoggerCreateDto): Promise<LoggerEntity>;

    warn(data: LoggerCreateDto): Promise<LoggerEntity>;

    fatal(data: LoggerCreateDto): Promise<LoggerEntity>;

    raw(data: LoggerCreateRawDto): Promise<LoggerEntity>;
}
