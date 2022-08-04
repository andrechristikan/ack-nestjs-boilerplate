import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { IRequestApp } from 'src/common/request/request.interface';

@Injectable()
export class VersionMiddleware implements NestMiddleware {
    constructor(
        private readonly configService: ConfigService,
        private readonly helperNumberService: HelperNumberService
    ) {}

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
        const originalUrl: string = req.originalUrl;
        let apiVersion = '1';
        if (
            versioning &&
            originalUrl.startsWith(`${globalPrefix}/${versioningPrefix}`)
        ) {
            const url: string[] = originalUrl.split('/');
            apiVersion = url[2].replace(versioningPrefix, '');
        }

        req.apiVersion = this.helperNumberService.create(apiVersion);

        next();
    }
}
