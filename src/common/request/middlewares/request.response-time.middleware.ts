import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import responseTime from 'response-time';

/**
 * Response time measurement middleware for performance monitoring and analysis.
 *
 * This middleware automatically measures and records the time taken to process each
 * HTTP request, from when the request is received until the response is sent back
 * to the client. It uses the response-time library to calculate precise timing
 * information and adds the 'X-Response-Time' header to responses.
 *
 * Performance Monitoring Features:
 * - Automatic response time calculation for all requests
 * - High-precision timing using process.hrtime()
 * - Response header injection with timing information
 * - Minimal performance overhead on request processing
 * - Compatible with logging and monitoring systems
 *
 * The timing information can be used for:
 * - Performance monitoring and alerting
 * - API response time analysis
 * - Identifying slow endpoints
 * - Load testing validation
 * - Service level agreement (SLA) monitoring
 *
 * @implements {NestMiddleware} - NestJS middleware interface for request processing
 * @see {@link https://www.npmjs.com/package/response-time} - Response-time library documentation
 */
@Injectable()
export class RequestResponseTimeMiddleware implements NestMiddleware {
    /**
     * Applies response time measurement to HTTP requests.
     *
     * Configures and applies the response-time middleware to automatically measure
     * the duration of request processing. The middleware adds an 'X-Response-Time'
     * header to responses containing the precise timing information in milliseconds.
     *
     * @param req - The Express request object
     * @param res - The Express response object
     * @param next - The next middleware function in the stack
     *
     * @returns Promise that resolves when response time middleware is applied
     */
    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        responseTime()(req, res, next);
    }
}
