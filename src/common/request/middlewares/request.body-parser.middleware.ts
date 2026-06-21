import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { ConfigService } from '@nestjs/config';

/**
 * Parses the body per content-type (json, urlencoded, text, octet-stream) with configured size
 * limits. Multipart is skipped on purpose, left to Multer for file uploads.
 */
@Injectable()
export class RequestBodyParserMiddleware implements NestMiddleware {
    private readonly jsonLimitInBytes: number;
    private readonly textLimitInBytes: number;
    private readonly urlencodedLimitInBytes: number;
    private readonly applicationOctetStreamLimitInBytes: number;

    constructor(private readonly configService: ConfigService) {
        this.jsonLimitInBytes = this.configService.get<number>(
            'request.body.json.limitInBytes'
        )!;
        this.textLimitInBytes = this.configService.get<number>(
            'request.body.text.limitInBytes'
        )!;
        this.urlencodedLimitInBytes = this.configService.get<number>(
            'request.body.urlencoded.limitInBytes'
        )!;
        this.applicationOctetStreamLimitInBytes =
            this.configService.get<number>(
                'request.body.applicationOctetStream.limitInBytes'
            )!;
    }

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
            // unknown/empty/multipart content-type: skip parsing (Multer handles multipart)
            next();
        }
    }
}
