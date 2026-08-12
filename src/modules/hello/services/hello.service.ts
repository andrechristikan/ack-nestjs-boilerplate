import { EnumAppEnvironment } from '@app/enums/app.enum';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { HelloResponseDto } from '@modules/hello/dtos/response/hello.response.dto';
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

    constructor(
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {
        this.appName = this.configService.get<string>('app.name')!;
        this.appEnv = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.appTimezone = this.configService.get<string>('app.timezone')!;

        this.messageAvailableLanguage = this.configService.get<
            EnumMessageLanguage[]
        >('message.availableLanguage')!;
        this.messageDefaultLanguage =
            this.configService.get<EnumMessageLanguage>('message.language')!;
    }

    async hello(): Promise<IResponseReturn<HelloResponseDto>> {
        const date = this.helperService.dateCreate();
        const dateIso = this.helperService.dateFormatToIso(date);
        const dateTimestamp = this.helperService.dateGetTimestamp(date);

        return {
            data: {
                date: {
                    date,
                    iso: dateIso,
                    timestamp: dateTimestamp,
                },
                app: {
                    name: this.appName,
                    env: this.appEnv,
                    timezone: this.appTimezone,
                },
                message: {
                    availableLanguage: this.messageAvailableLanguage,
                    defaultLanguage: this.messageDefaultLanguage,
                },
            },
        };
    }
}
