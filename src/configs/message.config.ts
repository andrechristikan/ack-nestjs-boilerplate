import { registerAs } from '@nestjs/config';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export default registerAs(
    'message',
    (): Record<string, any> => ({
        availableLanguage: Object.values(ENUM_MESSAGE_LANGUAGE),
        language: process.env.APP_LANGUAGE,
    })
);
