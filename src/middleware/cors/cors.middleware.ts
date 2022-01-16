import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { DEFAULT_METHOD_CORS, DEFAULT_ORIGIN_CORS } from './cors.constant';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        cors({
            origin: DEFAULT_ORIGIN_CORS,
            methods: DEFAULT_METHOD_CORS,
        })(req, res, next);
    }
}
