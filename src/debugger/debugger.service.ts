import { Injectable } from '@nestjs/common';
import DailyRotateFile from 'winston-daily-rotate-file';
import winston from 'winston';
import { DEBUGGER_NAME } from 'src/debugger/debugger.constant';
import { IDebuggerOptions } from 'src/debugger/debugger.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DebuggerService {
    constructor(private configService: ConfigService) {}

    createLogger(): IDebuggerOptions {
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
            dirname: `logs/${DEBUGGER_NAME}/default`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: maxSize,
            maxFiles: maxFiles,
            level: 'info'
        });

        const configTransportError: DailyRotateFile = new DailyRotateFile({
            filename: `%DATE%.log`,
            dirname: `logs/${DEBUGGER_NAME}/error`,
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

        const loggerOptions: IDebuggerOptions = {
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.prettyPrint()
            ),
            transports
        };
        return loggerOptions;
    }
}
