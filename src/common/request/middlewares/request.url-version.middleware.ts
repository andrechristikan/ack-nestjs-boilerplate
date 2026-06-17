import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response } from 'express';
import { IRequestApp } from '@common/request/interfaces/request.interface';

/**
 * Extracts the API version from the URL prefix into `req.version`, defaulting when disabled.
 */
@Injectable()
export class RequestUrlVersionMiddleware implements NestMiddleware {
    private readonly globalPrefix: string;

    private readonly urlVersionEnable: boolean;
    private readonly urlVersionPrefix: string;
    private readonly urlVersion: string;

    constructor(private readonly configService: ConfigService) {
        this.globalPrefix = this.configService.get<string>('app.globalPrefix')!;
        this.urlVersionEnable = this.configService.get<boolean>(
            'app.urlVersion.enable'
        )!;
        this.urlVersionPrefix = this.configService.get<string>(
            'app.urlVersion.prefix'
        )!;
        this.urlVersion = this.configService.get<string>(
            'app.urlVersion.version'
        )!;
    }

    async use(
        req: IRequestApp,
        _res: Response,
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
            version = url[2].replace(this.urlVersionPrefix, '');
        }

        req.version = version;

        next();
    }
}
