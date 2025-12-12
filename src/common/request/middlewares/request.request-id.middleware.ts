import { IRequestApp } from '@common/request/interfaces/request.interface';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { v7 as uuid } from 'uuid';

/**
 * Middleware for generating and attaching request and correlation IDs.
 *
 * - Automatically generates and attaches a unique UUID as the request ID to each incoming HTTP request.
 * - Checks for an existing `x-correlation-id` header; if present and valid, attaches it to the request and headers.
 * - If no correlation ID is provided, generates a new UUID and sets it as the correlation ID in both the request and headers.
 */
@Injectable()
export class RequestRequestIdMiddleware implements NestMiddleware {
    /**
     * Handles request and correlation ID assignment for each request.
     *
     * @param req - The Express request object
     * @param _res - The Express response object
     * @param next - The next middleware function
     *
     * - Sets `req.id` to a new UUID for request identification.
     * - Sets `req.correlationId` to the value of `x-correlation-id` header if provided and valid, otherwise generates a new UUID.
     * - Ensures the `x-correlation-id` header is present and synchronized with `req.correlationId`.
     */
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
