import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response } from 'express';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { HelperService } from '@common/helper/services/helper.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestLanguageStoreKey } from '@common/request/constants/request.constant';

/**
 * Resolves the request language from `x-custom-lang`, validated against supported languages.
 */
@Injectable()
export class RequestCustomLanguageMiddleware implements NestMiddleware {
    private readonly availableLanguage: string[];
    private readonly defaultLanguage: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperService: HelperService,
        private readonly requestStoreService: RequestStoreService
    ) {
        this.availableLanguage = this.configService.get<string[]>(
            'message.availableLanguage'
        )!;
        this.defaultLanguage =
            this.configService.get<string>('message.language')!;
    }

    async use(
        req: IRequestApp,
        _res: Response,
        next: NextFunction
    ): Promise<void> {
        let customLang: string = this.defaultLanguage;

        const reqLanguages: string = req.headers['x-custom-lang'] as string;
        if (reqLanguages) {
            const language: string[] = this.filterLanguage(reqLanguages);

            if (language.length > 0) {
                customLang = reqLanguages;
            }
        }

        this.requestStoreService.set(RequestLanguageStoreKey, customLang);
        req.headers['x-custom-lang'] = customLang;

        next();
    }

    private filterLanguage(customLanguage: string): string[] {
        return this.helperService.arrayIntersection(
            [customLanguage],
            this.availableLanguage
        );
    }
}
