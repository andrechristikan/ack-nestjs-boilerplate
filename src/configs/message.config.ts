import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { registerAs } from '@nestjs/config';

export interface IConfigMessage {
    availableLanguage: string[];
    language: string;
}

export default registerAs(
    'message',
    (): IConfigMessage => ({
        availableLanguage: Object.values(ENUM_MESSAGE_LANGUAGE),
        language: process.env.APP_LANGUAGE ?? ENUM_MESSAGE_LANGUAGE.EN,
    })
);
