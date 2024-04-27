import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { ENUM_APP_ENVIRONMENT } from 'src/app/constants/app.enum.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class RequestVersionMiddleware implements NestMiddleware {
    private readonly env: ENUM_APP_ENVIRONMENT;

    private readonly versioningEnable: boolean;

    private readonly versioningGlobalPrefix: string;
    private readonly versioningPrefix: string;
    private readonly versioningVersion: string;

    constructor(private readonly configService: ConfigService) {
        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');

        this.versioningGlobalPrefix =
            this.configService.get<string>('app.globalPrefix');
        this.versioningEnable = this.configService.get<boolean>(
            'app.versioning.enable'
        );
        this.versioningPrefix = this.configService.get<string>(
            'app.versioning.prefix'
        );
        this.versioningVersion = this.configService.get<string>(
            'app.versioning.version'
        );
    }

    async use(
        req: IRequestApp,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const originalUrl: string = req.originalUrl;
        let version = this.versioningVersion;
        if (
            this.versioningEnable &&
            originalUrl.startsWith(
                `${this.versioningGlobalPrefix}/${this.versioningPrefix}`
            )
        ) {
            const url: string[] = originalUrl.split('/');
            if (this.env === ENUM_APP_ENVIRONMENT.PRODUCTION) {
                version = url[1].replace(this.versioningPrefix, '');
            } else {
                version = url[2].replace(this.versioningPrefix, '');
            }
        }

        req.__version = version;

        next();
    }
}
