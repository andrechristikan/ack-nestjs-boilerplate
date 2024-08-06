import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class AppUrlVersionMiddleware implements NestMiddleware {
    private readonly env: ENUM_APP_ENVIRONMENT;

    private readonly globalPrefix: string;

    private readonly urlVersionEnable: boolean;
    private readonly urlVersionPrefix: string;
    private readonly urlVersion: string;

    constructor(private readonly configService: ConfigService) {
        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');

        this.globalPrefix = this.configService.get<string>('app.globalPrefix');
        this.urlVersionEnable = this.configService.get<boolean>(
            'app.urlVersion.enable'
        );
        this.urlVersionPrefix = this.configService.get<string>(
            'app.urlVersion.prefix'
        );
        this.urlVersion = this.configService.get<string>(
            'app.urlVersion.version'
        );
    }

    async use(
        req: IRequestApp,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const originalUrl: string = req.originalUrl;
        let version = this.urlVersion;
        if (
            this.urlVersionEnable &&
            originalUrl.startsWith(
                `${this.globalPrefix}/${this.urlVersionPrefix}`
            )
        ) {
            const url: string[] = originalUrl.split('/');
            if (this.env === ENUM_APP_ENVIRONMENT.PRODUCTION) {
                version = url[1].replace(this.urlVersionPrefix, '');
            } else {
                version = url[2].replace(this.urlVersionPrefix, '');
            }
        }

        req.__version = version;

        next();
    }
}
