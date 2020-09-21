import { Injectable, Scope } from '@nestjs/common';
import { ConfigService } from 'config/config.service';
import { Languages } from 'language/language.constant';
import { Config } from 'config/config.decorator';

@Injectable({ scope: Scope.DEFAULT })
export class LanguageService {
    private readonly languages: Record<string, any> = Languages;

    constructor(@Config() private readonly configService: ConfigService) {}

    get(keys: string): string {
        const key: string[] = keys.split('.');
        let selectedLanguage: Record<string, any> | string = this.languages[
            this.configService.getEnv('APP_LANGUAGE')
        ];

        for (let i = 0; i < key.length; i += 1) {
            selectedLanguage = selectedLanguage[key[i]];
        }

        return selectedLanguage as string;
    }
}
