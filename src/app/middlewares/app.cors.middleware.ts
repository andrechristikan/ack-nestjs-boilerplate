import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppCorsMiddleware implements NestMiddleware {
    private readonly allowOrigin: string | boolean | string[];
    private readonly allowMethod: string[];
    private readonly allowHeader: string[];

    constructor(private readonly configService: ConfigService) {
        this.allowOrigin = this.configService.get<string | boolean | string[]>(
            'middleware.cors.allowOrigin'
        );
        this.allowMethod = this.configService.get<string[]>(
            'middleware.cors.allowMethod'
        );
        this.allowHeader = this.configService.get<string[]>(
            'middleware.cors.allowHeader'
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
