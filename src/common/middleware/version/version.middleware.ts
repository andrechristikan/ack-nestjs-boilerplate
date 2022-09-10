import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class VersionMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    async use(
        req: IRequestApp,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const globalPrefix: boolean =
            this.configService.get<boolean>('app.globalPrefix');
        const versioning: boolean =
            this.configService.get<boolean>('app.versioning.on');
        const versioningPrefix: string = this.configService.get<string>(
            'app.versioning.prefix'
        );
        const versionConfig: string =
            this.configService.get<string>('app.version');
        const repoVersionConfig: string =
            this.configService.get<string>('app.repoVersion');

        const originalUrl: string = req.originalUrl;
        let version = versionConfig;
        if (
            versioning &&
            originalUrl.startsWith(`${globalPrefix}/${versioningPrefix}`)
        ) {
            const url: string[] = originalUrl.split('/');
            version = url[2].replace(versioningPrefix, '');
        }

        req.version = version;
        req.headers['x-version'] = version;
        req.repoVersion = repoVersionConfig;
        req.headers['x-repo-version'] = repoVersionConfig;

        next();
    }
}
