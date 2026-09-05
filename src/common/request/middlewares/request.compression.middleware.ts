import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import compression from 'compression';

/**
 * Applies gzip/deflate response compression based on client capabilities.
 */
@Injectable()
export class RequestCompressionMiddleware implements NestMiddleware {
    use(req: IRequestApp, res: Response, next: NextFunction): void {
        compression()(req, res, next);
    }
}
