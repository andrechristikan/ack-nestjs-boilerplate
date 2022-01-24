import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import {
    DEFAULT_HEADER_CORS,
    DEFAULT_METHOD_CORS,
    DEFAULT_ORIGIN_CORS,
} from './cors.constant';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        const allowOrigin = this.configService.get<string | boolean | string[]>(
            'middleware.cors.allowOrigin'
        );
        const allowMethod = this.configService.get<string[]>(
            'middleware.cors.allowMethod'
        );
        const allowHeader = this.configService.get<string[]>(
            'middleware.cors.allowHeader'
        );

        const whitelist = allowOrigin as string[];
        const corsOptions: CorsOptions = {
            origin: DEFAULT_ORIGIN_CORS,
            methods: allowMethod || DEFAULT_METHOD_CORS,
            allowedHeaders: allowHeader || DEFAULT_HEADER_CORS,
            preflightContinue: false,
            credentials: true,
            optionsSuccessStatus: HttpStatus.NO_CONTENT,
        };

        if (Array.isArray(allowOrigin)) {
            if (whitelist.indexOf(req.headers['origin']) !== -1) {
                corsOptions.origin = true;
            }
        } else if (
            typeof allowOrigin === 'string' ||
            typeof allowOrigin === 'boolean'
        ) {
            corsOptions.origin = allowOrigin;
        }

        cors(corsOptions)(req, res, next);
    }
}
