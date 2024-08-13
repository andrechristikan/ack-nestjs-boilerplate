import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class AppCustomLanguageMiddleware implements NestMiddleware {
    private readonly availableLanguage: string[];

    constructor(
        private readonly configService: ConfigService,
        private readonly helperArrayService: HelperArrayService
    ) {
        this.availableLanguage = this.configService.get<string[]>(
            'message.availableLanguage'
        );
    }

    async use(
        req: IRequestApp,
        res: Response,
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
        return this.helperArrayService.getIntersection(
            [customLanguage],
            this.availableLanguage
        );
    }
}
