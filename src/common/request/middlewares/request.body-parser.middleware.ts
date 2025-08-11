import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { ConfigService } from '@nestjs/config';

/**
 * Unified body parser middleware that handles multiple content types with intelligent parsing.
 *
 * This middleware automatically detects the incoming request's content-type header and applies
 * the appropriate body parser from the body-parser library. It supports JSON, URL-encoded forms,
 * text content, multipart data, and binary streams with configurable size limits for each type.
 * The middleware prevents parsing conflicts by only processing relevant content types and
 * gracefully handles requests with unknown or missing content-type headers.
 *
 * Supported content types and their corresponding parsers:
 * - `application/json` → JSON parser with configurable size limit
 * - `application/x-www-form-urlencoded` → URL-encoded parser for form submissions
 * - `text/*` → Text parser for plain text content
 * - `multipart/*` → Raw parser for multipart form data and file uploads
 * - `application/octet-stream` → Raw parser for binary data streams
 * - Unknown or missing content-type → Passes through without parsing
 *
 * All size limits are configurable through the application's middleware configuration
 * and help prevent memory exhaustion from oversized request payloads.
 *
 * @implements {NestMiddleware} - NestJS middleware interface for request processing
 * @see {@link https://www.npmjs.com/package/body-parser} - Body-parser library documentation
 */
@Injectable()
export class RequestBodyParserMiddleware implements NestMiddleware {
    private readonly jsonLimit: number;
    private readonly textLimit: number;
    private readonly rawLimit: number;
    private readonly urlencodedLimit: number;
    private readonly applicationOctetStreamLimit: number;

    constructor(private readonly configService: ConfigService) {
        this.jsonLimit = this.configService.get<number>(
            'request.middleware.body.json.limit'
        );
        this.textLimit = this.configService.get<number>(
            'request.middleware.body.text.limit'
        );
        this.rawLimit = this.configService.get<number>(
            'request.middleware.body.raw.limit'
        );
        this.urlencodedLimit = this.configService.get<number>(
            'request.middleware.body.urlencoded.limit'
        );
        this.applicationOctetStreamLimit = this.configService.get<number>(
            'request.middleware.body.applicationOctetStream.limit'
        );
    }

    /**
     * Middleware function that processes HTTP request bodies based on content-type.
     *
     * @description Analyzes the request's content-type header and applies the appropriate
     * body parser. If no content-type is specified or an unknown type is encountered,
     * the request passes through without body parsing.
     *
     * @param {Request} req - The Express request object
     * @param {Response} res - The Express response object
     * @param {NextFunction} next - The next middleware function in the stack
     *
     * @returns {void}
     *
     * @throws {PayloadTooLargeError} When request body exceeds configured size limits
     * @throws {SyntaxError} When JSON parsing fails for malformed JSON payloads
     */
    use(req: Request, res: Response, next: NextFunction): void {
        const contentType = req.get('content-type') || '';

        if (contentType.includes('application/json')) {
            bodyParser.json({
                limit: this.jsonLimit,
                type: 'application/json',
            })(req, res, next);
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            bodyParser.urlencoded({
                extended: false,
                limit: this.urlencodedLimit,
                type: 'application/x-www-form-urlencoded',
            })(req, res, next);
        } else if (contentType.includes('text/')) {
            bodyParser.text({
                limit: this.textLimit,
                type: 'text/*',
            })(req, res, next);
        } else if (contentType.includes('multipart/')) {
            bodyParser.raw({
                limit: this.rawLimit,
                type: 'multipart/*',
            })(req, res, next);
        } else if (contentType.includes('application/octet-stream')) {
            bodyParser.raw({
                limit: this.applicationOctetStreamLimit,
                type: 'application/octet-stream',
            })(req, res, next);
        } else {
            /**
             * For requests with no content-type, empty content-type, or unknown content-types:
             * Skip body parsing and continue to the next middleware.
             * This allows other middleware or route handlers to handle the request appropriately.
             */
            next();
        }
    }
}
