import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import responseTime from 'response-time';

/**
 * Middleware to measure and log the response time of requests.
 * It uses the response-time library to calculate the time taken to process each request.
 */
@Injectable()
export class AppResponseTimeMiddleware implements NestMiddleware {
    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        responseTime()(req, res, next);
    }
}
