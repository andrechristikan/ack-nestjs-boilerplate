import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestUtil } from '@common/request/utils/request.util';

@Injectable()
export class RequestRequestLogMiddleware implements NestMiddleware {
    constructor(
        private readonly requestStoreService: RequestStoreService,
        private readonly requestUtil: RequestUtil
    ) {}

    use(req: IRequestApp, _res: Response, next: NextFunction): void {
        const requestLog = this.requestUtil.buildRequestLog(req);
        this.requestStoreService.set(RequestLogStoreKey, requestLog);

        next();
    }
}
