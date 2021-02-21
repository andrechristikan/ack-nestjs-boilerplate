import {
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit
} from '@nestjs/common';
import DailyRotateFile from 'winston-daily-rotate-file';
import winston from 'winston';
import {
    LoggerMaxSize,
    LoggerMaxFiles,
    LoggerName
} from 'src/logger/logger.constant';
import { ILoggerOptions } from 'src/logger/logger.interface';
import { ConfigService } from '@nestjs/config';
import moment from 'moment';

@Injectable()
export class LoggerService {
    constructor(private configService: ConfigService) {}

    createLogger(): ILoggerOptions {
        const randomString: string =
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
        const timestamp: number = moment().valueOf();

        const configTransportDefault: DailyRotateFile = new DailyRotateFile({
            filename: `%DATE%.log`,
            dirname: `logs/${LoggerName}/default`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: LoggerMaxSize,
            maxFiles: LoggerMaxFiles,
            level: 'info'
        });

        const configTransportError: DailyRotateFile = new DailyRotateFile({
            filename: `%DATE%.log`,
            dirname: `logs/${LoggerName}/error`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: LoggerMaxSize,
            maxFiles: LoggerMaxFiles,
            level: 'error'
        });

        const loggerOptions: ILoggerOptions = {
            defaultMeta: {
                requestId: `${timestamp}${randomString}`
            },
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.prettyPrint()
            ),
            transports: [
                configTransportError,
                configTransportDefault,
                new winston.transports.Console({
                    silent: !this.configService.get('app.logger') || false
                })
            ]
        };
        return loggerOptions;
    }
}
