import { Injectable } from '@nestjs/common';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as winston from 'winston';
import { MaxSize, MaxFiles, Name as LoggerName } from 'logger/logger.constant';

@Injectable()
export class LoggerService {
    createLogger(): Record<string, any> {
        const configTransportDefault = new DailyRotateFile({
            filename: `./logs/${LoggerName}/default/%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: MaxSize,
            maxFiles: MaxFiles,
        });

        const configTransportError = new DailyRotateFile({
            filename: `./logs/${LoggerName}/error/%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: MaxSize,
            maxFiles: MaxFiles,
            level: 'error',
        });

        const loggerOptions: Record<string, any> = {
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.prettyPrint(),
            ),
            transports: [
                configTransportError,
                new winston.transports.Console(),
                configTransportDefault,
            ],
        };
        return loggerOptions;
    }
}
