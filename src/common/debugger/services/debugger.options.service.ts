import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import winston, { LoggerOptions } from 'winston';
import * as Transport from 'winston-transport';
import DailyRotateFile from 'winston-daily-rotate-file';
import { DEBUGGER_NAME } from 'src/common/debugger/constants/debugger.constant';
import { IDebuggerOptionService } from 'src/common/debugger/interfaces/debugger.options-service.interface';

@Injectable()
export class DebuggerOptionService implements IDebuggerOptionService {
    constructor(private configService: ConfigService) {}

    createLogger(): LoggerOptions {
        const writeIntoFile = this.configService.get<boolean>(
            'debugger.writeIntoFile'
        );
        const maxSize = this.configService.get<string>('debugger.maxSize');
        const maxFiles = this.configService.get<string>('debugger.maxFiles');

        const transports: Transport[] | Transport = [];

        if (writeIntoFile) {
            transports.push(
                new DailyRotateFile({
                    filename: `%DATE%.log`,
                    dirname: `logs/${DEBUGGER_NAME}/error`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: maxSize,
                    maxFiles: maxFiles,
                    level: 'error',
                })
            );
            transports.push(
                new DailyRotateFile({
                    filename: `%DATE%.log`,
                    dirname: `logs/${DEBUGGER_NAME}/default`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: maxSize,
                    maxFiles: maxFiles,
                    level: 'info',
                })
            );
        }

        const loggerOptions: LoggerOptions = {
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.prettyPrint()
            ),
            transports,
        };

        return loggerOptions;
    }
}
