import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

export interface IHelloApp {
    name: string;
    env: EnumAppEnvironment;
    timezone: string;
}

export interface IHelloMessage {
    availableLanguage: EnumMessageLanguage[];
    defaultLanguage: EnumMessageLanguage;
}
