import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { registerAs } from '@nestjs/config';

export interface IConfigMessage {
    availableLanguages: string[];
    defaultLanguage: EnumMessageLanguage;
}

export default registerAs('message', (): IConfigMessage => {
    return {
        availableLanguages: Object.values(EnumMessageLanguage),
        defaultLanguage: EnumMessageLanguage.en,
    };
});
