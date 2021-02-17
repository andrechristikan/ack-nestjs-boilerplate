import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Languages, { APP_LANGUAGE } from 'src/language/language.constant';

@Injectable()
export class LanguageService {
    private readonly languages: Record<string, any> = Languages;

    constructor(private readonly configService: ConfigService) {}

    get(key: string): string {
        // Env Variable
        const defaultLanguage =
            this.configService.get('app.language') || APP_LANGUAGE;

        const keys: string[] = key.split('.');
        let selectedLanguage: Record<string, any> | string = this.languages[
            defaultLanguage
        ];

        for (const i of keys) {
            selectedLanguage = selectedLanguage[i];
        }

        return selectedLanguage as string;
    }
}
