import { ENUM_APP_LANGUAGE } from '@app/enums/app.enum';
import { registerAs } from '@nestjs/config';

export interface IConfigMessage {
    availableLanguage: string[];
    language: string;
}

export default registerAs(
    'message',
    (): IConfigMessage => ({
        availableLanguage: Object.values(ENUM_APP_LANGUAGE),
        language: process.env.APP_LANGUAGE ?? ENUM_APP_LANGUAGE.EN,
    })
);
