import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { v7 as uuid } from 'uuid';
import {
    RequestCorrelationIdHeaderName,
    RequestCorrelationIdStoreKey,
    RequestIdHeaderName,
    RequestIdRegex,
    RequestIdStoreKey,
} from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';

/** The one source of the request id and the correlation id; runs first in the request chain, after nestjs-pino. */
@Injectable()
export class RequestRequestIdMiddleware implements NestMiddleware {
    constructor(private readonly requestStoreService: RequestStoreService) {}

    use(req: IRequestApp, _res: Response, next: NextFunction): void {
        const inboundRequestId = req.headers[RequestIdHeaderName];
        const requestId =
            typeof inboundRequestId === 'string' &&
            RequestIdRegex.test(inboundRequestId)
                ? inboundRequestId
                : uuid();
        req.id = requestId;
        req.headers[RequestIdHeaderName] = requestId;

        const inboundCorrelationId =
            req.headers[RequestCorrelationIdHeaderName];
        const correlationId =
            typeof inboundCorrelationId === 'string' &&
            RequestIdRegex.test(inboundCorrelationId)
                ? inboundCorrelationId
                : uuid();
        req.correlationId = correlationId;
        req.headers[RequestCorrelationIdHeaderName] = correlationId;

        this.requestStoreService.set(RequestIdStoreKey, requestId);
        this.requestStoreService.set(
            RequestCorrelationIdStoreKey,
            correlationId
        );

        next();
    }
}
