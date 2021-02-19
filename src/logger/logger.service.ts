import { Injectable } from '@nestjs/common';
import DailyRotateFile from 'winston-daily-rotate-file';
import winston from 'winston';
import {
    LoggerMaxSize,
    LoggerMaxFiles,
    LoggerName
} from 'src/logger/logger.constant';
import { ILoggerOptions } from 'src/logger/logger.interface';

@Injectable()
export class LoggerService {
    createLogger(): ILoggerOptions {
        const configTransportDefault: DailyRotateFile = new DailyRotateFile({
            filename: `./logs/${LoggerName}/default/%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: LoggerMaxSize,
            maxFiles: LoggerMaxFiles
        });

        const configTransportError: DailyRotateFile = new DailyRotateFile({
            filename: `./logs/${LoggerName}/error/%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: LoggerMaxSize,
            maxFiles: LoggerMaxFiles,
            level: 'error'
        });

        const loggerOptions: ILoggerOptions = {
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.prettyPrint()
            ),
            transports: [
                configTransportError,
                configTransportDefault,
                new winston.transports.Console()
            ]
        };
        return loggerOptions;
    }
}
