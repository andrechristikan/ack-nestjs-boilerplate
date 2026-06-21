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

    private readonly authPasswordAttempt: boolean;
    private readonly authPasswordMaxAttempt: number;
    private readonly authPasswordExpiredInSeconds: number;
    private readonly authPasswordExpiredTemporaryInSeconds: number;
    private readonly authPasswordPeriodInSeconds: number;

    private readonly messageAvailableLanguage: EnumMessageLanguage[];
    private readonly messageDefaultLanguage: EnumMessageLanguage;

    private readonly requestTimeoutInMs: number;
    private readonly requestBodyJsonLimitInBytes: number;
    private readonly requestBodyRawLimitInBytes: number;
    private readonly requestBodyTextLimitInBytes: number;
    private readonly requestBodyUrlencodedLimitInBytes: number;
    private readonly requestBodyApplicationOctetStreamLimitInBytes: number;
    private readonly requestThrottleTtlInMs: number;
    private readonly requestThrottleLimit: number;

    constructor(
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {
        this.appName = this.configService.get<string>('app.name')!;
        this.appEnv = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.appTimezone = this.configService.get<string>('app.timezone')!;

        this.authPasswordAttempt = this.configService.get<boolean>(
            'auth.password.attempt'
        )!;
        this.authPasswordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
        this.authPasswordExpiredInSeconds = this.configService.get<number>(
            'auth.password.expiredInSeconds'
        )!;
        this.authPasswordExpiredTemporaryInSeconds =
            this.configService.get<number>(
                'auth.password.expiredTemporaryInSeconds'
            )!;
        this.authPasswordPeriodInSeconds = this.configService.get<number>(
            'auth.password.periodInSeconds'
        )!;

        this.messageAvailableLanguage =
            this.configService.get<EnumMessageLanguage[]>(
                'message.availableLanguage'
            )!;
        this.messageDefaultLanguage =
            this.configService.get<EnumMessageLanguage>('message.language')!;

        this.requestTimeoutInMs = this.configService.get<number>(
            'request.timeoutInMs'
        )!;
        this.requestBodyJsonLimitInBytes = this.configService.get<number>(
            'request.body.json.limitInBytes'
        )!;
        this.requestBodyRawLimitInBytes = this.configService.get<number>(
            'request.body.raw.limitInBytes'
        )!;
        this.requestBodyTextLimitInBytes = this.configService.get<number>(
            'request.body.text.limitInBytes'
        )!;
        this.requestBodyUrlencodedLimitInBytes = this.configService.get<number>(
            'request.body.urlencoded.limitInBytes'
        )!;
        this.requestBodyApplicationOctetStreamLimitInBytes =
            this.configService.get<number>(
                'request.body.applicationOctetStream.limitInBytes'
            )!;
        this.requestThrottleTtlInMs = this.configService.get<number>(
            'request.throttle.ttlInMs'
        )!;
        this.requestThrottleLimit = this.configService.get<number>(
            'request.throttle.limit'
        )!;
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
                auth: {
                    passwordAttempt: this.authPasswordAttempt,
                    passwordMaxAttempt: this.authPasswordMaxAttempt,
                    passwordExpiredInSeconds: this.authPasswordExpiredInSeconds,
                    passwordExpiredTemporaryInSeconds:
                        this.authPasswordExpiredTemporaryInSeconds,
                    passwordPeriodInSeconds: this.authPasswordPeriodInSeconds,
                },
                message: {
                    availableLanguage: this.messageAvailableLanguage,
                    defaultLanguage: this.messageDefaultLanguage,
                },
                request: {
                    timeoutInMs: this.requestTimeoutInMs,
                    bodyJsonLimitInBytes: this.requestBodyJsonLimitInBytes,
                    bodyRawLimitInBytes: this.requestBodyRawLimitInBytes,
                    bodyTextLimitInBytes: this.requestBodyTextLimitInBytes,
                    bodyUrlencodedLimitInBytes:
                        this.requestBodyUrlencodedLimitInBytes,
                    bodyApplicationOctetStreamLimitInBytes:
                        this.requestBodyApplicationOctetStreamLimitInBytes,
                    throttleTtlInMs: this.requestThrottleTtlInMs,
                    throttleLimit: this.requestThrottleLimit,
                },
            },
        };
    }
}
