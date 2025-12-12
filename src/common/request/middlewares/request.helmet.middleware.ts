import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

/**
 * Security headers middleware powered by Helmet for enhanced application protection.
 * Applies comprehensive security headers to protect against common web vulnerabilities.
 */
@Injectable()
export class RequestHelmetMiddleware implements NestMiddleware {
    /**
     * Applies Helmet security middleware to set protective HTTP headers.
     *
     * @param req - The Express request object
     * @param res - The Express response object
     * @param next - The next middleware function
     */
    use(req: Request, res: Response, next: NextFunction): void {
        helmet()(req, res, next);
    }
}
