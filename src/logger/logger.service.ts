import { Injectable } from '@nestjs/common';
import DailyRotateFile from 'winston-daily-rotate-file';
import winston from 'winston';
import { LOGGER_NAME } from 'src/logger/logger.constant';
import { ILoggerOptions } from 'src/logger/logger.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService {
    constructor(private configService: ConfigService) {}

    createLogger(): ILoggerOptions {
        const logger: boolean =
            this.configService.get<boolean>('app.debug') &&
            this.configService.get<boolean>('app.debugger.system.active');
        const maxSize = this.configService.get<string>(
            'app.debugger.system.maxSize'
        );
        const maxFiles = this.configService.get<string>(
            'app.debugger.system.maxFiles'
        );

        const configTransportDefault: DailyRotateFile = new DailyRotateFile({
            filename: `%DATE%.log`,
            dirname: `logs/${LOGGER_NAME}/default`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: maxSize,
            maxFiles: maxFiles,
            level: 'info'
        });

        const configTransportError: DailyRotateFile = new DailyRotateFile({
            filename: `%DATE%.log`,
            dirname: `logs/${LOGGER_NAME}/error`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: maxSize,
            maxFiles: maxFiles,
            level: 'error'
        });

        const transports = [];
        if (logger) {
            transports.push(configTransportError);
            transports.push(configTransportDefault);
        }

        transports.push(
            new winston.transports.Console({
                silent: !logger
            })
        );

        const loggerOptions: ILoggerOptions = {
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.prettyPrint()
            ),
            transports
        };
        return loggerOptions;
    }
}
