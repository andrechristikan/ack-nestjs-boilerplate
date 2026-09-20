import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import responseTime from 'response-time';

/**
 * Adds the `X-Response-Time` header measuring request processing time.
 */
@Injectable()
export class RequestResponseTimeMiddleware implements NestMiddleware {
    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        responseTime()(req, res, next);
    }
}
