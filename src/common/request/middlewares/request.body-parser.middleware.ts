import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { ConfigService } from '@nestjs/config';

/**
 * Unified body parser middleware that handles multiple content types.
 * Automatically detects content-type and applies appropriate body parser with configurable size limits.
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
     * @param req - The Express request object
     * @param res - The Express response object
     * @param next - The next middleware function
     */
    use(req: Request, res: Response, next: NextFunction): void {
        const contentType = req.get('content-type') || '';

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
        } else if (contentType.includes('multipart/')) {
            bodyParser.raw({
                limit: this.rawLimitInBytes,
                type: 'multipart/*',
            })(req, res, next);
        } else if (contentType.includes('application/octet-stream')) {
            bodyParser.raw({
                limit: this.applicationOctetStreamLimitInBytes,
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
