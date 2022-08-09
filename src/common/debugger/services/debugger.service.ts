import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { IDebuggerLog } from '../debugger.interface';

@Injectable()
export class DebuggerService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
    ) {}

    info(_id: string, log: IDebuggerLog, data?: any): void {
        this.logger.info(log.description, {
            _id,
            class: log.class,
            function: log.function,
            path: log.path,
            data,
        });
    }

    debug(_id: string, log: IDebuggerLog, data?: any): void {
        this.logger.debug(log.description, {
            _id,
            class: log.class,
            function: log.function,
            path: log.path,
            data,
        });
    }

    warn(_id: string, log: IDebuggerLog, data?: any): void {
        this.logger.warn(log.description, {
            _id,
            class: log.class,
            function: log.function,
            path: log.path,
            data,
        });
    }

    error(_id: string, log: IDebuggerLog, data?: any): void {
        this.logger.error(log.description, {
            _id,
            class: log.class,
            function: log.function,
            path: log.path,
            data,
        });
    }
}
