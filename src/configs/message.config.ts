import { registerAs } from '@nestjs/config';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/constants/message.enum.constant';

export default registerAs(
    'message',
    (): Record<string, any> => ({
        availableLanguage: Object.values(ENUM_MESSAGE_LANGUAGE),
        language: process.env.APP_LANGUAGE ?? ENUM_MESSAGE_LANGUAGE.EN,
    })
);
