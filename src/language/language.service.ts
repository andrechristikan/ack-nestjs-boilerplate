import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Languages, { APP_LANGUAGE } from 'language/language.constant';

@Injectable()
export class LanguageService {
    private readonly languages: Record<string, any> = Languages;

    constructor(private readonly configService: ConfigService) {}

    get(key: string): string {
        const keys: string[] = key.split('.');
        const defaultLanguage =
            this.configService.get('app.language') || APP_LANGUAGE;
        let selectedLanguage: Record<string, any> | string = this.languages[
            defaultLanguage
        ];

        for (const i of keys) {
            selectedLanguage = selectedLanguage[i];
        }

        return selectedLanguage as string;
    }

    getAll(key: string): Record<string, any> {
        const keys: string[] = key.split('.');
        const defaultLanguage =
            this.configService.get('app.language') || APP_LANGUAGE;

        let selectedLanguage: Record<string, any> | string = this.languages[
            defaultLanguage
        ];

        for (const [i, v] of keys.entries()) {
            selectedLanguage = selectedLanguage[v];
            if (i + 1 >= keys.length) continue;
        }

        return selectedLanguage as Record<string, any>;
    }
}
