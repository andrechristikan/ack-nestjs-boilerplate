import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CacheService } from 'src/cache/service/cache.service';

@Injectable()
export class DebuggerService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly cacheService: CacheService
    ) {}

    info(
        description: string,
        sClass: string,
        sFunction: string,
        data?: any
    ): void {
        this.cacheService.getRequestId().then((request: string) => {
            this.logger.info(description, {
                request: request || 'unknown',
                class: sClass,
                function: sFunction,
                data,
            });
        });
    }

    debug(
        description: string,
        sClass: string,
        sFunction: string,
        data?: any
    ): void {
        this.cacheService.getRequestId().then((request: string) => {
            this.logger.debug(description, {
                request: request || 'unknown',
                class: sClass,
                function: sFunction,
                data,
            });
        });
    }

    error(
        description: string,
        sClass: string,
        sFunction: string,
        error?: any
    ): void {
        this.cacheService.getRequestId().then((request: string) => {
            this.logger.error(description, {
                request: request || 'unknown',
                class: sClass,
                function: sFunction,
                error,
            });
        });
    }
}
