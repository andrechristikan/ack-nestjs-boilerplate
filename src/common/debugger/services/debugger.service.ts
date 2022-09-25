import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { IDebuggerLog } from 'src/common/debugger/interfaces/debugger.interface';
import { IDebuggerService } from 'src/common/debugger/interfaces/debugger.service.interface';

@Injectable()
export class DebuggerService implements IDebuggerService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    info(requestId: string, log: IDebuggerLog, data?: any): void {
        this.logger.info(log.description, {
            _id: requestId,
            class: log.class,
            function: log.function,
            path: log.path,
            data,
        });
    }

    debug(requestId: string, log: IDebuggerLog, data?: any): void {
        this.logger.debug(log.description, {
            _id: requestId,
            class: log.class,
            function: log.function,
            path: log.path,
            data,
        });
    }

    warn(requestId: string, log: IDebuggerLog, data?: any): void {
        this.logger.warn(log.description, {
            _id: requestId,
            class: log.class,
            function: log.function,
            path: log.path,
            data,
        });
    }

    error(requestId: string, log: IDebuggerLog, data?: any): void {
        this.logger.error(log.description, {
            _id: requestId,
            class: log.class,
            function: log.function,
            path: log.path,
            data,
        });
    }
}
