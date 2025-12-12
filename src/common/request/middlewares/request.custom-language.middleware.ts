import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response } from 'express';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { HelperService } from '@common/helper/services/helper.service';

/**
 * Custom language detection and assignment middleware for internationalization support.
 * Processes 'x-custom-lang' header and validates against supported languages.
 */
@Injectable()
export class RequestCustomLanguageMiddleware implements NestMiddleware {
    private readonly availableLanguage: string[];

    constructor(
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.availableLanguage = this.configService.get<string[]>(
            'message.availableLanguage'
        );
    }

    /**
     * Processes incoming requests to detect and validate custom language preferences.
     *
     * @param req - The Express request object extended with custom properties
     * @param _res - The Express response object
     * @param next - The next middleware function
     */
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

    /**
     * Validates requested language against available languages.
     *
     * @param customLanguage - The language code to validate
     * @returns Array of valid languages that match available languages
     */
    private filterLanguage(customLanguage: string): string[] {
        return this.helperService.arrayIntersection(
            [customLanguage],
            this.availableLanguage
        );
    }
}
