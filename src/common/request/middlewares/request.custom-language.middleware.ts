import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response } from 'express';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { HelperService } from '@common/helper/services/helper.service';

/**
 * Custom language detection and assignment middleware for internationalization support.
 *
 * This middleware processes incoming requests to detect and validate custom language
 * preferences from the 'x-custom-lang' header. It ensures that only supported languages
 * are accepted and falls back to the default application language when an unsupported
 * or missing language is specified.
 *
 * Language Processing Flow:
 * - Extracts language preference from 'x-custom-lang' request header
 * - Validates the requested language against configured available languages
 * - Sets the validated language in the request object for downstream processing
 * - Updates the request header with the final selected language
 * - Falls back to default language configuration when validation fails
 *
 * The middleware modifies the request object by adding a `__language` property
 * and ensuring the 'x-custom-lang' header contains a valid language code.
 *
 * @implements {NestMiddleware} - NestJS middleware interface for request processing
 * @see {@link HelperService.arrayIntersection} - Utility method for language validation
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
     * Examines the 'x-custom-lang' header from the request and validates it against
     * the list of available languages configured in the application. If a valid
     * language is found, it's applied to the request; otherwise, the default
     * application language is used.
     *
     * @param req - The Express request object extended with custom properties
     * @param _res - The Express response object (unused in language processing)
     * @param next - The next middleware function in the stack
     *
     * @returns Promise that resolves when language processing is complete
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
     * Validates and filters the requested language against available languages.
     *
     * Uses array intersection to determine if the requested custom language
     * is supported by the application. This ensures that only configured
     * languages are accepted and prevents potential security issues from
     * arbitrary language codes.
     *
     * @param customLanguage - The language code from the request header
     * @returns Array containing the language if valid, empty array if invalid
     *
     * @private
     */
    private filterLanguage(customLanguage: string): string[] {
        return this.helperService.arrayIntersection(
            [customLanguage],
            this.availableLanguage
        );
    }
}
