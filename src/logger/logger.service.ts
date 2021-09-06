import { Injectable } from '@nestjs/common';
import DailyRotateFile from 'winston-daily-rotate-file';
import winston from 'winston';
import { LOGGER_NAME } from 'src/logger/logger.constant';
import { ILoggerOptions } from 'src/logger/logger.interface';
import { ConfigService } from '@nestjs/config';
import moment from 'moment';

@Injectable()
export class LoggerService {
    constructor(private configService: ConfigService) {}

    createLogger(): ILoggerOptions {
        const loggerEnv: boolean = !this.configService.get<boolean>(
            'app.logger.system.silent'
        );
        const maxSize = this.configService.get<string>(
            'app.logger.system.maxSize'
        );
        const maxFiles = this.configService.get<string>(
            'app.logger.system.maxFiles'
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
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.prettyPrint()
            ),
            transports
        };
        return loggerOptions;
    }
}
