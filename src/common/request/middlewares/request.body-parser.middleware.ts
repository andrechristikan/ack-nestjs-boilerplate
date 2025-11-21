import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { ConfigService } from '@nestjs/config';

/**
 * Unified body parser middleware that handles multiple content types.
 * Automatically detects content-type and applies appropriate body parser with configurable size limits.
 *
 * Supported Content Types:
 * - application/json: JSON data with configurable size limit
 * - application/x-www-form-urlencoded: URL-encoded form data
 * - text/*: Plain text content
 * - application/octet-stream: Binary data
 *
 * Note: Multipart form data (multipart/form-data) is intentionally skipped
 * as it will be handled by Multer middleware for file uploads.
 */
@Injectable()
export class RequestBodyParserMiddleware implements NestMiddleware {
    private readonly jsonLimitInBytes: number;
    private readonly textLimitInBytes: number;
    private readonly rawLimitInBytes: number;
    private readonly urlencodedLimitInBytes: number;
    private readonly applicationOctetStreamLimitInBytes: number;

    constructor(private readonly configService: ConfigService) {
        this.jsonLimitInBytes = this.configService.get<number>(
            'request.body.json.limitInBytes'
        );
        this.textLimitInBytes = this.configService.get<number>(
            'request.body.text.limitInBytes'
        );
        this.rawLimitInBytes = this.configService.get<number>(
            'request.body.raw.limitInBytes'
        );
        this.urlencodedLimitInBytes = this.configService.get<number>(
            'request.body.urlencoded.limitInBytes'
        );
        this.applicationOctetStreamLimitInBytes =
            this.configService.get<number>(
                'request.body.applicationOctetStream.limitInBytes'
            );
    }

    /**
     * Processes HTTP request bodies based on content-type header.
     *
     * The middleware examines the Content-Type header and applies the appropriate
     * body parser with the configured size limits:
     *
     * - JSON requests: Parsed with json parser
     * - URL-encoded forms: Parsed with urlencoded parser (extended: false)
     * - Text content: Parsed with text parser for any text/* type
     * - Binary data: Parsed with raw parser for application/octet-stream
     * - Multipart forms: Skipped (handled by Multer middleware)
     * - Unknown/empty content-type: Skipped, passed to next middleware
     *
     * @param req - The Express request object containing the HTTP request data
     * @param res - The Express response object for sending HTTP response
     * @param next - The next middleware function in the chain
     */
    use(req: Request, res: Response, next: NextFunction): void {
        const contentType = req.get('content-type') ?? '';

        if (contentType.includes('application/json')) {
            bodyParser.json({
                limit: this.jsonLimitInBytes,
                type: 'application/json',
            })(req, res, next);
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            bodyParser.urlencoded({
                extended: false,
                limit: this.urlencodedLimitInBytes,
                type: 'application/x-www-form-urlencoded',
            })(req, res, next);
        } else if (contentType.includes('text/')) {
            bodyParser.text({
                limit: this.textLimitInBytes,
                type: 'text/*',
            })(req, res, next);
        } else if (contentType.includes('application/octet-stream')) {
            bodyParser.raw({
                limit: this.applicationOctetStreamLimitInBytes,
                type: 'application/octet-stream',
            })(req, res, next);
        } else {
            /**
             * For requests with no content-type, empty content-type, or unknown content-types
             * (including multipart/form-data):
             * Skip body parsing and continue to the next middleware.
             *
             * Multipart forms are intentionally not processed here as they will be
             * handled by Multer middleware which is specifically designed for file uploads
             * and multipart form processing.
             *
             * This allows other middleware or route handlers to handle the request appropriately.
             */
            next();
        }
    }
}
