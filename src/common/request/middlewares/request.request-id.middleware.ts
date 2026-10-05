import {
    RequestCorrelationIdHeaderName,
    RequestCorrelationIdStoreKey,
    RequestIdHeaderName,
    RequestIdStoreKey,
} from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { v7 as uuid } from 'uuid';

/**
 * Assigns a fresh `req.id` and reuses or generates the correlation id header, syncing it back to headers.
 */
@Injectable()
export class RequestRequestIdMiddleware implements NestMiddleware {
    constructor(private readonly requestStoreService: RequestStoreService) {}

    use(req: IRequestApp, _res: Response, next: NextFunction): void {
        req.id = uuid();
        req.headers[RequestIdHeaderName] = req.id;

        const correlationId = req.headers[RequestCorrelationIdHeaderName];
        if (correlationId && typeof correlationId === 'string') {
            req.correlationId = correlationId;
            req.headers[RequestCorrelationIdHeaderName] = correlationId;
        } else {
            const newCorrelationId = uuid();

            req.correlationId = newCorrelationId;
            req.headers[RequestCorrelationIdHeaderName] = newCorrelationId;
        }

        this.requestStoreService.set(RequestIdStoreKey, req.id);
        this.requestStoreService.set(
            RequestCorrelationIdStoreKey,
            req.correlationId
        );

        next();
    }
}
