import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

/**
 * Middleware to enhance security by setting various HTTP headers.
 * It uses the helmet library to set security-related HTTP headers.
 * This middleware helps protect the application from common web vulnerabilities.
 */
@Injectable()
export class AppHelmetMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        helmet()(req, res, next);
    }
}
