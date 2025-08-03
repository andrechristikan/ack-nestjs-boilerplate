import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { ConfigService } from '@nestjs/config';

/**
 * Middleware to parse URL-encoded bodies.
 * It uses the body-parser library to handle incoming requests with URL-encoded payloads.
 * The maximum file size is configurable through the application configuration.
 */
@Injectable()
export class AppUrlencodedBodyParserMiddleware implements NestMiddleware {
    private readonly maxFile: number;

    constructor(private readonly configService: ConfigService) {
        this.maxFile = this.configService.get<number>(
            'middleware.body.urlencoded.maxFileSize'
        );
    }

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.urlencoded({
            extended: false,
            limit: this.maxFile,
        })(req, res, next);
    }
}

/**
 * Middleware to parse JSON bodies.
 * It uses the body-parser library to handle incoming requests with JSON payloads.
 * The maximum file size is configurable through the application configuration.
 */
@Injectable()
export class AppJsonBodyParserMiddleware implements NestMiddleware {
    private readonly maxFile: number;

    constructor(private readonly configService: ConfigService) {
        this.maxFile = this.configService.get<number>(
            'middleware.body.json.maxFileSize'
        );
    }

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.json({
            limit: this.maxFile,
        })(req, res, next);
    }
}

/**
 * Middleware to parse raw bodies.
 * It uses the body-parser library to handle incoming requests with raw payloads.
 * The maximum file size is configurable through the application configuration.
 */
@Injectable()
export class AppRawBodyParserMiddleware implements NestMiddleware {
    private readonly maxFile: number;

    constructor(private readonly configService: ConfigService) {
        this.maxFile = this.configService.get<number>(
            'middleware.body.raw.maxFileSize'
        );
    }

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.raw({
            limit: this.maxFile,
        })(req, res, next);
    }
}

/**
 * Middleware to parse text bodies.
 * It uses the body-parser library to handle incoming requests with text payloads.
 * The maximum file size is configurable through the application configuration.
 */
@Injectable()
export class AppTextBodyParserMiddleware implements NestMiddleware {
    private readonly maxFile: number;

    constructor(private readonly configService: ConfigService) {
        this.maxFile = this.configService.get<number>(
            'middleware.body.text.maxFileSize'
        );
    }

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.text({
            limit: this.maxFile,
        })(req, res, next);
    }
}
