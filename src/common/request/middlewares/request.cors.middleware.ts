import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { ConfigService } from '@nestjs/config';

/**
 * Cross-Origin Resource Sharing (CORS) middleware.
 * Configures CORS policies for allowed origins, methods, and headers with credential handling.
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

    /**
     * Applies CORS configuration to HTTP requests.
     *
     * @param req - The Express request object
     * @param res - The Express response object
     * @param next - The next middleware function
     */
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

        // TODO: Review if custom handling is needed for preflight requests and support subdomains wildcard origins
        cors(corsOptions)(req, res, next);
    }
}
