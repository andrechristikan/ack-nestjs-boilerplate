import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v7 as uuid } from 'uuid';

/**
 * Request ID generation middleware.
 *
 * Automatically generates and attaches a unique UUID to each incoming HTTP request.
 * This request ID is essential for distributed tracing, correlation of logs across
 * different services, and debugging request flows.
 *
 * The generated ID is attached to the Express Request object and can be accessed
 * throughout the request lifecycle by controllers, services, and other middleware.
 *
 * @see {@link uuid} UUID v7 generation library
 */
@Injectable()
export class AppRequestIdMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction): void {
        req.id = uuid();

        next();
    }
}
