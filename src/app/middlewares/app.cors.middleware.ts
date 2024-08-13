import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { ConfigService } from '@nestjs/config';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';

@Injectable()
export class AppCorsMiddleware implements NestMiddleware {
    private readonly appEnv: ENUM_APP_ENVIRONMENT;
    private readonly allowOrigin: string | boolean | string[];
    private readonly allowMethod: string[];
    private readonly allowHeader: string[];

    constructor(private readonly configService: ConfigService) {
        this.appEnv = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
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
        const allowOrigin =
            this.appEnv === ENUM_APP_ENVIRONMENT.PRODUCTION
                ? this.allowOrigin
                : '*';

        const corsOptions: CorsOptions = {
            origin: allowOrigin,
            methods: this.allowMethod,
            allowedHeaders: this.allowHeader,
            preflightContinue: false,
            credentials: true,
            optionsSuccessStatus: HttpStatus.NO_CONTENT,
        };

        cors(corsOptions)(req, res, next);
    }
}
