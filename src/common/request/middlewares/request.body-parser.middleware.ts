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
