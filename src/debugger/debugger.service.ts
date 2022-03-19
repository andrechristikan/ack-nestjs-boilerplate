import { Inject, Injectable } from '@nestjs/common';
import DailyRotateFile from 'winston-daily-rotate-file';
import winston, { Logger } from 'winston';
import { DEBUGGER_NAME } from 'src/debugger/debugger.constant';
import { IDebuggerOptions } from 'src/debugger/debugger.interface';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class DebuggerOptionService {
    private readonly debug: boolean;
    private readonly logger: boolean;
    private readonly maxSize: string;
    private readonly maxFiles: string;

    constructor(private configService: ConfigService) {
        this.debug = this.configService.get<boolean>('app.debug');
        this.logger = this.configService.get<boolean>(
            'app.debugger.system.active'
        );
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
        if (this.logger || (this.logger && this.debug)) {
            transports.push(configTransportError);
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

@Injectable()
export class DebuggerService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
    ) {}

    info(
        description: string,
        sClass: string,
        sFunction: string,
        data?: any
    ): void {
        this.logger.info(description, {
            class: sClass,
            function: sFunction,
            data,
        });
    }

    error(
        description: string,
        sClass: string,
        sFunction: string,
        error?: any
    ): void {
        this.logger.error(description, {
            class: sClass,
            function: sFunction,
            error,
        });
    }
}
