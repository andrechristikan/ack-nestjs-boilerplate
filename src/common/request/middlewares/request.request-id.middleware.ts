import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v7 as uuid } from 'uuid';

/**
 * Request ID generation middleware.
 * Automatically generates and attaches a unique UUID to each incoming HTTP request.
 */
@Injectable()
export class RequestRequestIdMiddleware implements NestMiddleware {
    /**
     * Generates unique request ID and attaches to request object.
     *
     * @param req - The Express request object
     * @param _res - The Express response object
     * @param next - The next middleware function
     */
    use(req: Request, _res: Response, next: NextFunction): void {
        req.id = uuid();

        next();
    }
}
