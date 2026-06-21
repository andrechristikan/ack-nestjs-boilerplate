import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

/**
 * Sets protective HTTP security headers via Helmet.
 */
@Injectable()
export class RequestHelmetMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        helmet()(req, res, next);
    }
}
