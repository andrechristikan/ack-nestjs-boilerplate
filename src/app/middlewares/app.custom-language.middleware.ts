import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response } from 'express';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { HelperService } from '@common/helper/services/helper.service';

/**
 * Middleware to set a custom language for the application.
 * It checks the request headers for a custom language and sets it if available.
 * The available languages are configured through the application configuration.
 */
@Injectable()
export class AppCustomLanguageMiddleware implements NestMiddleware {
    private readonly availableLanguage: string[];

    constructor(
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.availableLanguage = this.configService.get<string[]>(
            'message.availableLanguage'
        );
    }

    async use(
        req: IRequestApp,
        _res: Response,
        next: NextFunction
    ): Promise<void> {
        let customLang: string =
            this.configService.get<string>('message.language');

        const reqLanguages: string = req.headers['x-custom-lang'] as string;
        if (reqLanguages) {
            const language: string[] = this.filterLanguage(reqLanguages);

            if (language.length > 0) {
                customLang = reqLanguages;
            }
        }

        req.__language = customLang;
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
