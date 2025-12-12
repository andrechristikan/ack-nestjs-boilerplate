import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import responseTime from 'response-time';

/**
 * Response time measurement middleware for performance monitoring.
 * Automatically measures request processing time and adds 'X-Response-Time' header.
 */
@Injectable()
export class RequestResponseTimeMiddleware implements NestMiddleware {
    /**
     * Applies response time measurement to HTTP requests.
     *
     * @param req - The Express request object
     * @param res - The Express response object
     * @param next - The next middleware function
     */
    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        responseTime()(req, res, next);
    }
}
