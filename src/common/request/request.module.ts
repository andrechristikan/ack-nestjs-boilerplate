import {
    DynamicModule,
    HttpStatus,
    Module,
    ValidationPipe,
} from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ValidationError } from 'class-validator';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import { RequestTimeoutInterceptor } from '@common/request/interceptors/request.timeout.interceptor';
import { IsCustomEmailConstraint } from '@common/request/validations/request.custom-email.validation';
import { IsAfterNowConstraint } from '@common/request/validations/request.is-after-now.validation';
import {
    GreaterThanEqualOtherPropertyConstraint,
    GreaterThanOtherPropertyConstraint,
} from '@common/request/validations/request.greater-than-other-property.validation';
import { IsPasswordConstraint } from '@common/request/validations/request.is-password.validation';
import {
    LessThanEqualOtherPropertyConstraint,
    LessThanOtherPropertyConstraint,
} from '@common/request/validations/request.less-than-other-property.validation';
import { RequestMiddlewareModule } from '@common/request/request.middleware.module';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestUtil } from '@common/request/utils/request.util';
import { ClsModule } from 'nestjs-cls';

/**
 * Global module wiring the validation pipe, timeout interceptor, custom validators,
 * `RequestStoreService`, and middleware.
 */
@Module({})
export class RequestModule {
    static forRoot(): DynamicModule {
        return {
            module: RequestModule,
            global: true,
            controllers: [],
            exports: [RequestStoreService, RequestUtil],
            providers: [
                RequestStoreService,
                RequestUtil,
                {
                    provide: APP_INTERCEPTOR,
                    useClass: RequestTimeoutInterceptor,
                },
                {
                    provide: APP_PIPE,
                    useFactory: () =>
                        new ValidationPipe({
                            transform: true,
                            skipMissingProperties: false,
                            skipNullProperties: false,
                            skipUndefinedProperties: false,
                            forbidUnknownValues: true,
                            whitelist: true,
                            forbidNonWhitelisted: true,
                            transformOptions: {
                                excludeExtraneousValues: false,
                            },
                            validationError: {
                                target: false,
                                value: true,
                            },
                            errorHttpStatusCode:
                                HttpStatus.UNPROCESSABLE_ENTITY,
                            exceptionFactory: async (
                                errors: ValidationError[]
                            ) => new RequestValidationException(errors),
                        }),
                },
                GreaterThanEqualOtherPropertyConstraint,
                GreaterThanOtherPropertyConstraint,
                IsAfterNowConstraint,
                IsPasswordConstraint,
                IsCustomEmailConstraint,
                LessThanEqualOtherPropertyConstraint,
                LessThanOtherPropertyConstraint,
            ],
            imports: [
                ClsModule.forRoot({
                    global: true,
                    middleware: { mount: true },
                }),
                RequestMiddlewareModule,
            ],
        };
    }
}
