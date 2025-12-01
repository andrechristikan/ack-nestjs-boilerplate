import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { HelperService } from '@common/helper/services/helper.service';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { HelloResponseDto } from '@modules/hello/dtos/response/hello.response.dto';
import { IHelloService } from '@modules/hello/interfaces/hello.service.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HelloService implements IHelloService {
    constructor(
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {}

    async hello(): Promise<IResponseReturn<HelloResponseDto>> {
        // date
        const date = this.helperService.dateCreate();
        const dateIso = this.helperService.dateFormatToIso(date);
        const dateTimestamp = this.helperService.dateGetTimestamp(date);

        // app
        const appName = this.configService.get<string>('app.name')!;
        const appEnv = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env')!;
        const appTimezone = this.configService.get<string>('app.timezone')!;

        // auth
        const authPasswordAttempt = this.configService.get<boolean>(
            'auth.password.attempt'
        )!;
        const authPasswordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
        const authPasswordExpiredInSeconds = this.configService.get<number>(
            'auth.password.expiredInSeconds'
        )!;
        const authPasswordExpiredTemporaryInSeconds =
            this.configService.get<number>(
                'auth.password.expiredTemporaryInSeconds'
            )!;
        const authPasswordPeriodInSeconds = this.configService.get<number>(
            'auth.password.periodInSeconds'
        )!;

        // message
        const messageAvailableLanguage: ENUM_MESSAGE_LANGUAGE[] =
            this.configService.get<ENUM_MESSAGE_LANGUAGE[]>(
                'message.availableLanguage'
            )!;
        const messageDefaultLanguage: ENUM_MESSAGE_LANGUAGE =
            this.configService.get<ENUM_MESSAGE_LANGUAGE>('message.language')!;

        // request
        const requestTimeoutInMs = this.configService.get<number>(
            'request.timeoutInMs'
        )!;
        const requestBodyJsonLimitInBytes = this.configService.get<number>(
            'request.body.json.limitInBytes'
        )!;
        const requestBodyRawLimitInBytes = this.configService.get<number>(
            'request.body.raw.limitInBytes'
        )!;
        const requestBodyTextLimitInBytes = this.configService.get<number>(
            'request.body.text.limitInBytes'
        )!;
        const requestBodyUrlencodedLimitInBytes =
            this.configService.get<number>(
                'request.body.urlencoded.limitInBytes'
            )!;
        const requestBodyApplicationOctetStreamLimitInBytes =
            this.configService.get<number>(
                'request.body.applicationOctetStream.limitInBytes'
            )!;
        const requestThrottleTtlInMs = this.configService.get<number>(
            'request.throttle.ttlInMs'
        )!;
        const requestThrottleLimit = this.configService.get<number>(
            'request.throttle.limit'
        )!;

        return {
            data: {
                date: {
                    date,
                    iso: dateIso,
                    timestamp: dateTimestamp,
                },
                app: {
                    name: appName,
                    env: appEnv,
                    timezone: appTimezone,
                },
                auth: {
                    passwordAttempt: authPasswordAttempt,
                    passwordMaxAttempt: authPasswordMaxAttempt,
                    passwordExpiredIn: authPasswordExpiredInSeconds,
                    passwordExpiredInTemporary:
                        authPasswordExpiredTemporaryInSeconds,
                    passwordPeriod: authPasswordPeriodInSeconds,
                },
                message: {
                    availableLanguage: messageAvailableLanguage,
                    defaultLanguage: messageDefaultLanguage,
                },
                request: {
                    timeoutInMs: requestTimeoutInMs,
                    bodyJsonLimitInBytes: requestBodyJsonLimitInBytes,
                    bodyRawLimitInBytes: requestBodyRawLimitInBytes,
                    bodyTextLimitInBytes: requestBodyTextLimitInBytes,
                    bodyUrlencodedLimitInBytes:
                        requestBodyUrlencodedLimitInBytes,
                    bodyApplicationOctetStreamLimitInBytes:
                        requestBodyApplicationOctetStreamLimitInBytes,
                    throttleTtlInMs: requestThrottleTtlInMs,
                    throttleLimit: requestThrottleLimit,
                },
            },
        };
    }
}
