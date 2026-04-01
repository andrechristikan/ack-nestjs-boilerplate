import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import compression from 'compression';

/**
 * HTTP response compression middleware for improved performance and bandwidth optimization.
 * Applies gzip/deflate compression to responses based on client capabilities.
 */
@Injectable()
export class RequestCompressionMiddleware implements NestMiddleware {
    /**
     * Applies compression middleware to HTTP responses.
     *
     * @param req - The Express request object
     * @param res - The Express response object
     * @param next - The next middleware function
     */
    use(req: IRequestApp, res: Response, next: NextFunction): void {
        compression()(req, res, next);
    }
}
