import { IRequestApp } from '@common/request/interfaces/request.interface';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { v7 as uuid } from 'uuid';

/**
 * Assigns a fresh `req.id` and reuses or generates `x-correlation-id`, syncing it back to headers.
 */
@Injectable()
export class RequestRequestIdMiddleware implements NestMiddleware {
    use(req: IRequestApp, _res: Response, next: NextFunction): void {
        req.id = uuid();

        const correlationId = req.headers['x-correlation-id'];
        if (correlationId && typeof correlationId === 'string') {
            req.correlationId = correlationId;
            req.headers['x-correlation-id'] = correlationId;
        } else {
            const newCorrelationId = uuid();

            req.correlationId = newCorrelationId;
            req.headers['x-correlation-id'] = newCorrelationId;
        }

        next();
    }
}
