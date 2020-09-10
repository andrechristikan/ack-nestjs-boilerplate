import { Injectable } from '@nestjs/common';
import { ConfigService } from 'config/config.service';
import id from 'language/resource/id';
import en from 'language/resource/en';

@Injectable()
export class LanguageService {
    private readonly languages: Record<string, any> = {
        id,
        en,
    };

    constructor(private readonly configService: ConfigService) {}

    get(keys: string): string {
        const key: string[] = keys.split('.');
        let selectedLanguage: Record<string, any>| string = this
            .languages[this.configService.getEnv('APP_LANGUAGE')];

        for (let i = 0; i < key.length; i += 1) {
            selectedLanguage = selectedLanguage[key[i]];
        }

        return selectedLanguage as string;
    }
}
