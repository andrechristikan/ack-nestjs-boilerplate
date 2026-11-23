import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    RequestCustomLangHeaderName,
    RequestCustomLanguageListSeparatorRegex,
    RequestCustomLanguageSubtagSeparatorRegex,
    RequestLanguageStoreKey,
} from '@common/request/constants/request.constant';

@Injectable()
export class RequestCustomLanguageMiddleware implements NestMiddleware {
    private readonly availableLanguages: string[];
    private readonly defaultLanguage: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperArrayService: HelperArrayService,
        private readonly requestStoreService: RequestStoreService
    ) {
        this.availableLanguages = this.configService.get<string[]>(
            'message.availableLanguages'
        )!;
        this.defaultLanguage = this.configService.get<string>(
            'message.defaultLanguage'
        )!;
    }

    private normalizeLanguage(language: string): string {
        return language
            .split(RequestCustomLanguageListSeparatorRegex)[0]!
            .split(RequestCustomLanguageSubtagSeparatorRegex)[0]!
            .trim()
            .toLowerCase();
    }

    private filterLanguage(customLanguage: string): string[] {
        return this.helperArrayService.intersection(
            [customLanguage],
            this.availableLanguages
        );
    }

    async use(
        req: IRequestApp,
        _res: Response,
        next: NextFunction
    ): Promise<void> {
        let customLang: string = this.defaultLanguage;

        const reqLanguages: string = req.headers[
            RequestCustomLangHeaderName
        ] as string;
        if (reqLanguages) {
            const normalized = this.normalizeLanguage(reqLanguages);
            const language: string[] = this.filterLanguage(normalized);

            if (language.length > 0) {
                customLang = normalized;
            }
        }

        this.requestStoreService.set(RequestLanguageStoreKey, customLang);
        req.headers[RequestCustomLangHeaderName] = customLang;

        next();
    }
}
