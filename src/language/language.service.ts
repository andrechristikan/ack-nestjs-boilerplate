import { Injectable, Scope } from '@nestjs/common';
import { ConfigService } from 'config/config.service';
import { Languages } from 'language/language.constant';
import { Config } from 'config/config.decorator';

@Injectable({ scope: Scope.DEFAULT })
export class LanguageService {
    private readonly languages: Record<string, any> = Languages;

    constructor(@Config() private readonly configService: ConfigService) {}

    get(key: string): string {
        const keys: string[] = key.split('.');
        let selectedLanguage: Record<string, any> | string = this.languages[
            this.configService.getEnv('APP_LANGUAGE')
        ];

        for (const i of keys) {
            selectedLanguage = selectedLanguage[i];
        }

        return selectedLanguage as string;
    }

    getAll(key: string): Record<string, any> {
        const keys: string[] = key.split('.');
        let selectedLanguage: Record<string, any> | string = this.languages[
            this.configService.getEnv('APP_LANGUAGE')
        ];

        for (const [i, v] of keys.entries()) {
            selectedLanguage = selectedLanguage[v];
            if (i + 1 >= keys.length) continue;
        }

        return selectedLanguage as Record<string, any>;
    }
}
