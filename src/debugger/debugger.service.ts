import { Injectable } from '@nestjs/common';
import DailyRotateFile from 'winston-daily-rotate-file';
import winston from 'winston';
import { DEBUGGER_NAME } from 'src/debugger/debugger.constant';
import { IDebuggerOptions } from 'src/debugger/debugger.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DebuggerService {
    private readonly env: string;
    private readonly logger: boolean;
    private readonly maxSize: string;
    private readonly maxFiles: string;

    constructor(private configService: ConfigService) {
        this.env = this.configService.get<string>('app.env');
        this.logger =
            this.configService.get<boolean>('app.debug') &&
            this.configService.get<boolean>('app.debugger.system.active');
        this.maxSize = this.configService.get<string>(
            'app.debugger.system.maxSize'
        );
        this.maxFiles = this.configService.get<string>(
            'app.debugger.system.maxFiles'
        );
    }

    createLogger(): IDebuggerOptions {
        const configTransportDefault: DailyRotateFile = new DailyRotateFile({
            filename: `%DATE%.log`,
            dirname: `logs/${DEBUGGER_NAME}/default`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: this.maxSize,
            maxFiles: this.maxFiles,
            level: 'info',
        });

        const configTransportError: DailyRotateFile = new DailyRotateFile({
            filename: `%DATE%.log`,
            dirname: `logs/${DEBUGGER_NAME}/error`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: this.maxSize,
            maxFiles: this.maxFiles,
            level: 'error',
        });

        const transports = [];
        if (this.logger) {
            transports.push(configTransportError);

            if (this.env !== 'production' && this.env !== 'testing')
                transports.push(configTransportDefault);
        }

        transports.push(
            new winston.transports.Console({
                silent: !this.logger,
            })
        );

        const loggerOptions: IDebuggerOptions = {
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.prettyPrint()
            ),
            transports,
        };
        return loggerOptions;
    }
}
