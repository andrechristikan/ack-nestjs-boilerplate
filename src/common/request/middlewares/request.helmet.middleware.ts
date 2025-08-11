import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

/**
 * Security headers middleware powered by Helmet for enhanced application protection.
 *
 * This middleware automatically applies a comprehensive set of security-related HTTP headers
 * to protect the application against common web vulnerabilities and attacks. It uses the
 * Helmet library which implements security best practices through HTTP headers.
 *
 * Security Headers Applied:
 * - Content Security Policy (CSP) - Prevents XSS attacks
 * - X-Frame-Options - Prevents clickjacking attacks
 * - X-Content-Type-Options - Prevents MIME type sniffing
 * - Referrer-Policy - Controls referrer information sharing
 * - X-Download-Options - Prevents file execution in IE
 * - X-DNS-Prefetch-Control - Controls DNS prefetching
 * - Strict-Transport-Security - Enforces HTTPS connections
 * - X-Permitted-Cross-Domain-Policies - Controls Adobe Flash/PDF policies
 *
 * The middleware applies sensible security defaults and helps achieve better security
 * ratings from security scanners and compliance frameworks.
 *
 * @implements {NestMiddleware} - NestJS middleware interface for request processing
 * @see {@link https://helmetjs.github.io/} - Helmet.js documentation and security guide
 */
@Injectable()
export class RequestHelmetMiddleware implements NestMiddleware {
    /**
     * Applies Helmet security middleware to set protective HTTP headers.
     *
     * Configures and applies the Helmet middleware with default security settings
     * to add multiple security headers to all HTTP responses. This helps protect
     * against various web vulnerabilities including XSS, clickjacking, MIME type
     * sniffing, and other common attack vectors.
     *
     * @param req - The Express request object
     * @param res - The Express response object
     * @param next - The next middleware function in the stack
     *
     * @returns void
     */
    use(req: Request, res: Response, next: NextFunction): void {
        helmet()(req, res, next);
    }
}
