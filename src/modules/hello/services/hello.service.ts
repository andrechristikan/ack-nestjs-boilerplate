import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    IHelloApp,
    IHelloMessage,
} from '@modules/hello/interfaces/hello.interface';
import { IHelloService } from '@modules/hello/interfaces/hello.service.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HelloService implements IHelloService {
    private readonly appName: string;
    private readonly appEnv: EnumAppEnvironment;
    private readonly appTimezone: string;

    private readonly messageAvailableLanguage: EnumMessageLanguage[];
    private readonly messageDefaultLanguage: EnumMessageLanguage;

    constructor(private readonly configService: ConfigService) {
        this.appName = this.configService.get<string>('app.name')!;
        this.appEnv = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.appTimezone = this.configService.get<string>('app.timezone')!;

        this.messageAvailableLanguage = this.configService.get<
            EnumMessageLanguage[]
        >('message.availableLanguage')!;
        this.messageDefaultLanguage =
            this.configService.get<EnumMessageLanguage>('message.language')!;
    }

    getApp(): IHelloApp {
        return {
            name: this.appName,
            env: this.appEnv,
            timezone: this.appTimezone,
        };
    }

    getMessage(): IHelloMessage {
        return {
            availableLanguage: this.messageAvailableLanguage,
            defaultLanguage: this.messageDefaultLanguage,
        };
    }
}
