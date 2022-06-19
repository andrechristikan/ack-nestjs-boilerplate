import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { CacheService } from 'src/cache/service/cache.service';
import { MessageService } from 'src/message/service/message.service';
import { HelperArrayService } from 'src/utils/helper/service/helper.array.service';

@Injectable()
export class CustomLanguageMiddleware implements NestMiddleware {
    constructor(
        private readonly messageService: MessageService,
        private readonly helperArrayService: HelperArrayService,
        private readonly configService: ConfigService,
        private readonly cacheService: CacheService
    ) {}

    async use(req: any, res: Response, next: NextFunction): Promise<void> {
        let language: string = this.configService.get<string>('app.language');
        const reqLanguages: string = req.headers['x-custom-lang'] as string;
        const enumLanguage: string[] = Object.values(
            await this.messageService.getLanguages()
        );
        if (reqLanguages) {
            const languages: string[] = this.helperArrayService.unique(
                reqLanguages
                    .split(',')
                    .filter((val) =>
                        this.helperArrayService.includes(enumLanguage, val)
                    )
            );

            if (languages.length > 0) {
                language = languages.join(',');
            }
        }

        req.headers['x-custom-lang'] = language;
        await this.cacheService.set(`x-custom-lang`, language);

        next();
    }
}
