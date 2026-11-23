import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    InjectThrottlerOptions,
    InjectThrottlerStorage,
    ThrottlerGuard,
    ThrottlerStorage,
} from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestUtil } from '@common/request/utils/request.util';

@Injectable()
export class RequestThrottleDefaultGuard extends ThrottlerGuard {
    constructor(
        @InjectThrottlerOptions()
        protected override readonly options: ThrottlerModuleOptions,
        @InjectThrottlerStorage()
        protected override readonly storageService: ThrottlerStorage,
        protected override readonly reflector: Reflector,
        private readonly requestUtil: RequestUtil
    ) {
        super(options, storageService, reflector);
    }

    protected override async getTracker(req: IRequestApp): Promise<string> {
        return this.requestUtil.getClientIp(req);
    }

    protected override generateKey(
        _context: ExecutionContext,
        suffix: string,
        _name: string
    ): string {
        return suffix;
    }
}
