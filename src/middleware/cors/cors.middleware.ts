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
        const env: string = this.configService.get<string>('app.env');

        if (env === 'production') {
            const allowOrigin = this.configService.get<
                string | boolean | string[]
            >('middleware.cors.allowOrigin');
            const allowMethod = this.configService.get<string[]>(
                'middleware.cors.allowMethod'
            );
            const allowHeader = this.configService.get<string[]>(
                'middleware.cors.allowHeader'
            );

            const corsOptions: CorsOptions = {
                origin: allowOrigin || DEFAULT_ORIGIN_CORS,
                methods: allowMethod || DEFAULT_METHOD_CORS,
                allowedHeaders: allowHeader || DEFAULT_HEADER_CORS,
                preflightContinue: false,
                credentials: true,
                optionsSuccessStatus: HttpStatus.NO_CONTENT,
            };

            cors(corsOptions)(req, res, next);
        } else {
            next();
        }
    }
}
