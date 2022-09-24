import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/constants/message.enum.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class CustomLanguageMiddleware implements NestMiddleware {
    constructor(
        private readonly helperArrayService: HelperArrayService,
        private readonly configService: ConfigService
    ) {}

    async use(
        req: IRequestApp,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        let language: string = this.configService.get<string>('app.language');
        let customLang: string[] = [language];

        const reqLanguages: string = req.headers['x-custom-lang'] as string;
        const enumLanguage: string[] = Object.values(ENUM_MESSAGE_LANGUAGE);
        if (reqLanguages) {
            const splitLanguage: string[] = reqLanguages
                .split(',')
                .map((val) => val.toLowerCase());
            const uniqueLanguage =
                this.helperArrayService.unique(splitLanguage);
            const languages: string[] = uniqueLanguage.filter((val) =>
                this.helperArrayService.includes(enumLanguage, val)
            );

            if (languages.length > 0) {
                language = languages.join(',');
                customLang = languages;
            }
        }

        req.headers['x-custom-lang'] = language;
        req.customLang = customLang;

        next();
    }
}
