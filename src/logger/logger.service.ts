import { Injectable } from '@nestjs/common';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as winston from 'winston';

@Injectable()
export class LoggerService {
    logger(loggerConfig: Record<string, any>): Record<string, any> {
        const configTransportDefault = new DailyRotateFile({
            filename: `./logs/${loggerConfig.name}/%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: loggerConfig.maxSize,
            maxFiles: loggerConfig.maxFiles,
        });

        const configTransportError = new DailyRotateFile({
            filename: `./logs/${loggerConfig.getConfig(
                'logger.name',
            )}/errors/%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: loggerConfig.maxSize,
            maxFiles: loggerConfig.maxFiles,
            level: 'error',
        });

        return {
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
    }
}
