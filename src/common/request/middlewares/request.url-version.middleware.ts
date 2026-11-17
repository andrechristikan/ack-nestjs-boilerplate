import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestVersionStoreKey } from '@common/request/constants/request.constant';

@Injectable()
export class RequestUrlVersionMiddleware implements NestMiddleware {
    private readonly globalPrefix: string;

    private readonly enabled: boolean;
    private readonly prefix: string;
    private readonly defaultVersion: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly requestStoreService: RequestStoreService
    ) {
        this.globalPrefix = this.configService.get<string>('app.globalPrefix')!;
        this.enabled = this.configService.get<boolean>(
            'app.urlVersioning.enabled'
        )!;
        this.prefix = this.configService.get<string>(
            'app.urlVersioning.prefix'
        )!;
        this.defaultVersion = this.configService.get<string>(
            'app.urlVersioning.defaultVersion'
        )!;
    }

    async use(
        req: IRequestApp,
        _res: Response,
        next: NextFunction
    ): Promise<void> {
        const originalUrl: string = req.originalUrl;
        let version = this.defaultVersion;
        if (
            this.enabled &&
            originalUrl.startsWith(`${this.globalPrefix}/${this.prefix}`)
        ) {
            const url: string[] = originalUrl.split('/');
            version = url[2]!.replace(this.prefix, '');
        }

        this.requestStoreService.set(RequestVersionStoreKey, version);

        next();
    }
}
