import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerOptions } from 'winston';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { DEBUGGER_NAME } from 'src/common/debugger/constants/debugger.constant';
import { IDebuggerOptionService } from 'src/common/debugger/interfaces/debugger.options-service.interface';

@Injectable()
export class DebuggerOptionService implements IDebuggerOptionService {
    constructor(private configService: ConfigService) {}

    createLogger(): LoggerOptions {
        const writeIntoFile = this.configService.get<boolean>(
            'debugger.system.writeIntoFile'
        );
        const writeIntoConsole = this.configService.get<boolean>(
            'debugger.system.writeIntoConsole'
        );
        const maxSize = this.configService.get<string>(
            'debugger.system.maxSize'
        );
        const maxFiles = this.configService.get<string>(
            'debugger.system.maxFiles'
        );

        const transports = [];

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
            transports.push(
                new DailyRotateFile({
                    filename: `%DATE%.log`,
                    dirname: `logs/${DEBUGGER_NAME}/debug`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: maxSize,
                    maxFiles: maxFiles,
                    level: 'debug',
                })
            );
        }

        if (writeIntoConsole) {
            transports.push(new winston.transports.Console());
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
