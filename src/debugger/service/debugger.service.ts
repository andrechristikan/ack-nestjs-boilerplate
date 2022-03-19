import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

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

    debug(
        description: string,
        sClass: string,
        sFunction: string,
        data?: any
    ): void {
        this.logger.debug(description, {
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
