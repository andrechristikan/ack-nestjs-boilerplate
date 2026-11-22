import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type {
    IHelloApp,
    IHelloMessage,
} from '@modules/hello/interfaces/hello.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HelloService {
    private readonly appName: string;
    private readonly appEnv: EnumAppEnvironment;
    private readonly timezone: string;

    private readonly availableLanguages: EnumMessageLanguage[];
    private readonly defaultLanguage: EnumMessageLanguage;

    constructor(private readonly configService: ConfigService) {
        this.appName = this.configService.get<string>('app.name')!;
        this.appEnv = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.timezone = this.configService.get<string>('app.timezone')!;

        this.availableLanguages = this.configService.get<EnumMessageLanguage[]>(
            'message.availableLanguages'
        )!;
        this.defaultLanguage = this.configService.get<EnumMessageLanguage>(
            'message.defaultLanguage'
        )!;
    }

    getApp(): IHelloApp {
        return {
            name: this.appName,
            env: this.appEnv,
            timezone: this.timezone,
        };
    }

    getMessage(): IHelloMessage {
        return {
            availableLanguage: this.availableLanguages,
            defaultLanguage: this.defaultLanguage,
        };
    }
}
