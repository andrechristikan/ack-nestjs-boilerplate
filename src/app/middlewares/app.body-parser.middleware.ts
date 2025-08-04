import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { ConfigService } from '@nestjs/config';

/**
 * Unified body parser middleware that handles all body types.
 *
 * @description It intelligently detects the content-type and applies the appropriate parser.
 * This prevents conflicts and improves performance by only parsing the relevant content-type.
 * The maximum file sizes are configurable through the application configuration.
 *
 * Behavior:
 * - `application/json` → JSON parser
 * - `application/x-www-form-urlencoded` → URL-encoded parser
 * - `text/*` → Text parser
 * - `application/octet-stream`, `multipart/*` → Raw parser
 * - No content-type or empty content-type → Skip parsing (pass through)
 * - Unknown content-types → Skip parsing (pass through)
 */
@Injectable()
export class AppBodyParserMiddleware implements NestMiddleware {
    private readonly jsonLimit: number;
    private readonly textLimit: number;
    private readonly rawLimit: number;
    private readonly urlencodedLimit: number;
    private readonly applicationOctetStreamLimit: number;

    constructor(private readonly configService: ConfigService) {
        this.jsonLimit = this.configService.get<number>(
            'middleware.body.json.limit'
        );
        this.textLimit = this.configService.get<number>(
            'middleware.body.text.limit'
        );
        this.rawLimit = this.configService.get<number>(
            'middleware.body.raw.limit'
        );
        this.urlencodedLimit = this.configService.get<number>(
            'middleware.body.urlencoded.limit'
        );
        this.applicationOctetStreamLimit = this.configService.get<number>(
            'middleware.body.applicationOctetStream.limit'
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
