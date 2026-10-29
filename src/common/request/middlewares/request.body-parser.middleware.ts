import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { ConfigService } from '@nestjs/config';
import { RequestPayloadTooLargeException } from '@common/request/exceptions/request.payload-too-large.exception';
import { RequestUnsupportedMediaTypeException } from '@common/request/exceptions/request.unsupported-media-type.exception';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';

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

    private mapError(error: unknown): unknown {
        if (typeof error !== 'object' || error === null) {
            return error;
        }

        const status: unknown = 'status' in error ? error.status : null;

        if (status === 413) {
            return new RequestPayloadTooLargeException();
        } else if (status === 415) {
            return new RequestUnsupportedMediaTypeException();
        } else if (
            typeof status === 'number' &&
            status >= 400 &&
            status < 500
        ) {
            const issue = {
                code: 'invalid_format',
                message: 'request.error.invalidFormat',
                path: ['body'],
            };

            return new RequestValidationException([issue]);
        }

        return error;
    }

    use(req: Request, res: Response, next: NextFunction): void {
        const done: NextFunction = (error?: unknown) => {
            if (error === undefined) {
                next();
                return;
            }

            const mapped = this.mapError(error);
            next(mapped);
        };
        const contentType = req.get('content-type') ?? '';

        if (contentType.includes('application/json')) {
            bodyParser.json({
                limit: this.jsonLimitInBytes,
                type: 'application/json',
            })(req, res, done);
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            bodyParser.urlencoded({
                extended: true,
                limit: this.urlencodedLimitInBytes,
                type: 'application/x-www-form-urlencoded',
            })(req, res, done);
        } else if (contentType.includes('text/')) {
            bodyParser.text({
                limit: this.textLimitInBytes,
                type: 'text/*',
            })(req, res, done);
        } else if (contentType.includes('application/octet-stream')) {
            bodyParser.raw({
                limit: this.applicationOctetStreamLimitInBytes,
                type: 'application/octet-stream',
            })(req, res, done);
        } else {
            // unknown/empty/multipart content-type: skip parsing (Multer handles multipart)
            next();
        }
    }
}
