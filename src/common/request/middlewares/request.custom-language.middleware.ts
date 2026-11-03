import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    RequestCustomLangHeaderName,
    RequestLanguageStoreKey,
} from '@common/request/constants/request.constant';

/**
 * Resolves the request language from the custom language header, validated against supported languages.
 */
@Injectable()
export class RequestCustomLanguageMiddleware implements NestMiddleware {
    private readonly availableLanguage: string[];
    private readonly defaultLanguage: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperArrayService: HelperArrayService,
        private readonly requestStoreService: RequestStoreService
    ) {
        this.availableLanguage = this.configService.get<string[]>(
            'message.availableLanguage'
        )!;
        this.defaultLanguage =
            this.configService.get<string>('message.language')!;
    }

    /**
     * Reduces a header value to the lowercased primary subtag of its first listed language.
     */
    private normalizeLanguage(language: string): string {
        return language
            .split(/[,;]/)[0]!
            .split(/[-_]/)[0]!
            .trim()
            .toLowerCase();
    }

    private filterLanguage(customLanguage: string): string[] {
        return this.helperArrayService.intersection(
            [customLanguage],
            this.availableLanguage
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
