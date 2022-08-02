import {
    HttpStatus,
    Module,
    UnprocessableEntityException,
    ValidationError,
    ValidationPipe,
} from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from './constants/request.status-code.constant';
import { RequestTimestampInterceptor } from './interceptors/request.timestamp.interceptor';
import { IsPasswordMediumConstraint } from './validations/request.is-password-medium.validation';
import { IsPasswordStrongConstraint } from './validations/request.is-password-strong.validation';
import { IsPasswordWeakConstraint } from './validations/request.is-password-weak.validation';
import { IsStartWithConstraint } from './validations/request.is-start-with.validation';
import { MaxGreaterThanEqualConstraint } from './validations/request.max-greater-than-equal.validation';
import { MaxGreaterThanConstraint } from './validations/request.max-greater-than.validation';
import { MinDateTodayEqualConstraint } from './validations/request.min-date-equal.validation';
import { MinGreaterThanEqualConstraint } from './validations/request.min-greater-than-equal.validation';
import { MinGreaterThanConstraint } from './validations/request.min-greater-than.validation';
import { IsOnlyDigitsConstraint } from './validations/request.only-digits.validation';
import { SafeStringConstraint } from './validations/request.safe-string.validation';
import { SkipConstraint } from './validations/request.skip.validation';
import { StringOrNumberOrBooleanConstraint } from './validations/request.string-or-number-or-boolean.validation';

@Module({
    controllers: [],
    providers: [
        {
            provide: APP_PIPE,
            useFactory: () =>
                new ValidationPipe({
                    transform: true,
                    skipNullProperties: false,
                    skipUndefinedProperties: false,
                    skipMissingProperties: false,
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                    exceptionFactory: async (errors: ValidationError[]) =>
                        new UnprocessableEntityException({
                            statusCode:
                                ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR,
                            message: 'http.clientError.unprocessableEntity',
                            errors,
                        }),
                }),
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: RequestTimestampInterceptor,
        },
        IsPasswordStrongConstraint,
        IsPasswordMediumConstraint,
        IsPasswordWeakConstraint,
        IsStartWithConstraint,
        MaxGreaterThanEqualConstraint,
        MaxGreaterThanConstraint,
        MinGreaterThanEqualConstraint,
        MinGreaterThanConstraint,
        SkipConstraint,
        StringOrNumberOrBooleanConstraint,
        SafeStringConstraint,
        IsOnlyDigitsConstraint,
        MinDateTodayEqualConstraint,
    ],
    imports: [],
})
export class RequestModule {}
