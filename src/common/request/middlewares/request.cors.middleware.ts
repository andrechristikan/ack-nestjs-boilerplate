import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { ConfigService } from '@nestjs/config';

/**
 * Cross-Origin Resource Sharing (CORS) middleware.
 *
 * Configures CORS policies to control which origins, methods, and headers
 * are allowed for cross-origin requests. The configuration is loaded from
 * the application's configuration service and supports both string and
 * array formats for origins.
 *
 * Security Features:
 * - Configurable allowed origins (supports wildcards and multiple domains)
 * - Controlled HTTP methods and headers
 * - Automatic credential handling based on origin configuration
 * - Preflight request handling with proper status codes
 *
 * @see {@link CorsOptions} CORS library options interface
 */
@Injectable()
export class RequestCorsMiddleware implements NestMiddleware {
    private readonly allowOrigin: string | boolean | string[];
    private readonly allowMethod: string[];
    private readonly allowHeader: string[];

    constructor(private readonly configService: ConfigService) {
        this.allowOrigin = this.configService.get<string | boolean | string[]>(
            'request.middleware.cors.allowOrigin'
        );
        this.allowMethod = this.configService.get<string[]>(
            'request.middleware.cors.allowMethod'
        );
        this.allowHeader = this.configService.get<string[]>(
            'request.middleware.cors.allowHeader'
        );
    }

    use(req: Request, res: Response, next: NextFunction): void {
        let credentials = true;
        if (typeof this.allowOrigin === 'string' && this.allowOrigin === '*') {
            credentials = false;
        } else if (
            Array.isArray(this.allowOrigin) &&
            this.allowOrigin.includes('*')
        ) {
            credentials = false;
        }

        const corsOptions: CorsOptions = {
            origin: this.allowOrigin,
            methods: this.allowMethod,
            allowedHeaders: this.allowHeader,
            preflightContinue: false,
            credentials,
            optionsSuccessStatus: HttpStatus.NO_CONTENT,
        };

        cors(corsOptions)(req, res, next);
    }
}
