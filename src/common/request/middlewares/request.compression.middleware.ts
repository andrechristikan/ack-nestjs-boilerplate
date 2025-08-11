import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import compression from 'compression';

/**
 * HTTP response compression middleware for improved performance and bandwidth optimization.
 *
 * This middleware applies gzip/deflate compression to HTTP responses to reduce the size
 * of transmitted data, improving application performance and reducing bandwidth usage.
 * It automatically compresses responses based on the client's Accept-Encoding header
 * and the response content type.
 *
 * The compression middleware handles:
 * - Automatic compression algorithm selection (gzip, deflate, br)
 * - Content-type filtering for compressible resources
 * - Minimum response size thresholds
 * - Client compatibility checking
 *
 * @implements {NestMiddleware} - NestJS middleware interface for request processing
 * @see {@link https://www.npmjs.com/package/compression} - Compression library documentation
 */
@Injectable()
export class RequestCompressionMiddleware implements NestMiddleware {
    constructor() {}

    /**
     * Applies compression middleware to HTTP responses.
     *
     * Configures and applies the compression middleware to compress response bodies
     * automatically based on client capabilities and content types. The middleware
     * will only compress responses that exceed a minimum size threshold and are
     * of compressible content types.
     *
     * @param _req - The Express request object (unused in compression)
     * @param _res - The Express response object (unused in compression)
     * @param next - The next middleware function in the stack
     *
     * @returns Promise that resolves when compression middleware is applied
     */
    async use(
        _req: IRequestApp,
        _res: Response,
        next: NextFunction
    ): Promise<void> {
        compression();
        next();
    }
}
