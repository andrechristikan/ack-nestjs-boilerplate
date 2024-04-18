import { HttpStatus, Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { RequestTimeoutInterceptor } from 'src/common/request/interceptors/request.timeout.interceptor';
import { RequestMiddlewareModule } from 'src/common/request/middleware/request.middleware.module';
import {
    ThrottlerGuard,
    ThrottlerModule,
    ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ValidationError } from 'class-validator';
import { RequestValidationException } from 'src/common/request/exceptions/request.validation.exception';

@Module({
    controllers: [],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: RequestTimeoutInterceptor,
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
        {
            provide: APP_PIPE,
            useFactory: () =>
                new ValidationPipe({
                    transform: true,
                    skipNullProperties: true,
                    skipUndefinedProperties: true,
                    skipMissingProperties: true,
                    forbidUnknownValues: true,
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                    exceptionFactory: async (errors: ValidationError[]) =>
                        new RequestValidationException(errors),
                }),
        },
    ],
    imports: [
        RequestMiddlewareModule,
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService): ThrottlerModuleOptions => ({
                throttlers: [
                    {
                        ttl: config.get('request.throttle.ttl'),
                        limit: config.get('request.throttle.limit'),
                    },
                ],
            }),
        }),
    ],
})
export class RequestModule {}
