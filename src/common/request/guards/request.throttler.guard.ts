import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    InjectThrottlerOptions,
    InjectThrottlerStorage,
    ThrottlerGuard,
    ThrottlerModuleOptions,
    ThrottlerStorage,
} from '@nestjs/throttler';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestUtil } from '@common/request/utils/request.util';

@Injectable()
export class RequestThrottlerGuard extends ThrottlerGuard {
    constructor(
        @InjectThrottlerOptions() options: ThrottlerModuleOptions,
        @InjectThrottlerStorage() storageService: ThrottlerStorage,
        reflector: Reflector,
        private readonly requestUtil: RequestUtil
    ) {
        super(options, storageService, reflector);
    }

    protected async getTracker(req: IRequestApp): Promise<string> {
        return this.requestUtil.resolveThrottleTrackerIp(req);
    }

    protected generateKey(
        _context: ExecutionContext,
        suffix: string,
        _name: string
    ): string {
        return suffix;
    }
}
