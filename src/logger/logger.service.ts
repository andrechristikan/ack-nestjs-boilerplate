import { Injectable } from '@nestjs/common';
import DailyRotateFile from 'winston-daily-rotate-file';
import winston from 'winston';
import {
    LOGGER_MAX_SIZE,
    LOGGER_MAX_FILES,
    LOGGER_NAME
} from 'src/logger/logger.constant';
import { ILoggerOptions } from 'src/logger/logger.interface';
import { ConfigService } from '@nestjs/config';
import moment from 'moment';

@Injectable()
export class LoggerService {
    constructor(private configService: ConfigService) {}

    createLogger(): ILoggerOptions {
        // Env Variable
        const loggerEnv: boolean =
            this.configService.get<string>('LOGGER_SYSTEM') === 'true'
                ? true
                : false;

        const randomString: string =
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
        const timestamp: number = moment().valueOf();

        const configTransportDefault: DailyRotateFile = new DailyRotateFile({
            filename: `%DATE%.log`,
            dirname: `logs/${LOGGER_NAME}/default`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: LOGGER_MAX_SIZE,
            maxFiles: LOGGER_MAX_FILES,
            level: 'info'
        });

        const configTransportError: DailyRotateFile = new DailyRotateFile({
            filename: `%DATE%.log`,
            dirname: `logs/${LOGGER_NAME}/error`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: LOGGER_MAX_SIZE,
            maxFiles: LOGGER_MAX_FILES,
            level: 'error'
        });

        const transports = [];
        if (loggerEnv) {
            transports.push(configTransportError);
            transports.push(configTransportDefault);
        }

        transports.push(
            new winston.transports.Console({
                silent: !loggerEnv || false
            })
        );
        const loggerOptions: ILoggerOptions = {
            defaultMeta: {
                requestId: `${timestamp}${randomString}`
            },
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.prettyPrint()
            ),
            transports
        };
        return loggerOptions;
    }
}
