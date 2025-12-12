import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { registerAs } from '@nestjs/config';

export interface IConfigMessage {
    availableLanguage: string[];
    language: string;
}

export default registerAs(
    'message',
    (): IConfigMessage => ({
        availableLanguage: Object.values(EnumMessageLanguage),
        language: process.env.APP_LANGUAGE ?? EnumMessageLanguage.en,
    })
);
