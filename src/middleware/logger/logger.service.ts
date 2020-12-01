import { Injectable, Scope } from '@nestjs/common';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { createStream } from 'rotating-file-stream';
import * as winston from 'winston';
import {
    LoggerMaxSize,
    LoggerMaxFiles,
    LoggerName,
    HttpLoggerFormat,
    HttpLoggerSize,
    HttpLoggerMaxSize,
    HttpLoggerName
} from 'middleware/logger/logger.constant';

@Injectable()
export class LoggerService {
    createLogger(): Record<string, any> {
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

        const loggerOptions: Record<string, any> = {
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.prettyPrint()
            ),
            transports: [
                configTransportError,
                new winston.transports.Console(),
                configTransportDefault
            ]
        };
        return loggerOptions;
    }

    static httpLogger(): Record<string, any> {
        const HttpLoggerOptions: Record<string, any> = {
            stream: createStream(`access.log`, {
                path: `./logs/${HttpLoggerName}/`,
                size: HttpLoggerSize,
                maxSize: HttpLoggerMaxSize,
                compress: true,
                interval: '1d'
            })
        };

        return {
            HttpLoggerFormat,
            HttpLoggerOptions
        };
    }
}
