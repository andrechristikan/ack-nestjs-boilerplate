import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { IDebuggerService } from 'src/common/debugger/interfaces/debugger.service.interface';

@Injectable()
export class DebuggerService implements IDebuggerService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    info(log: any): void {
        this.logger.info(log);
    }

    debug(log: any): void {
        this.logger.debug(log);
    }

    warn(log: any): void {
        this.logger.warn(log);
    }

    error(log: any): void {
        this.logger.error(log);
    }
}
