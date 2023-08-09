import {
    ExecutionContext,
    HttpStatus, Injectable,
    Module,
    UnprocessableEntityException,
    ValidationError,
    ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { RequestTimeoutInterceptor } from 'src/common/request/interceptors/request.timeout.interceptor';
import { RequestMiddlewareModule } from 'src/common/request/middleware/request.middleware.module';
import { MaxDateTodayConstraint } from 'src/common/request/validations/request.max-date-today.validation';
import { MinDateTodayConstraint } from 'src/common/request/validations/request.min-date-today.validation';
import { MobileNumberAllowedConstraint } from 'src/common/request/validations/request.mobile-number-allowed.validation';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from './constants/request.status-code.constant';
import { IsPasswordMediumConstraint } from './validations/request.is-password-medium.validation';
import { IsPasswordStrongConstraint } from './validations/request.is-password-strong.validation';
import { IsPasswordWeakConstraint } from './validations/request.is-password-weak.validation';
import { IsStartWithConstraint } from './validations/request.is-start-with.validation';
import { MaxGreaterThanEqualConstraint } from './validations/request.max-greater-than-equal.validation';
import { MaxGreaterThanConstraint } from './validations/request.max-greater-than.validation';
import { MinGreaterThanEqualConstraint } from './validations/request.min-greater-than-equal.validation';
import { MinGreaterThanConstraint } from './validations/request.min-greater-than.validation';
import { IsOnlyDigitsConstraint } from './validations/request.only-digits.validation';
import { SafeStringConstraint } from './validations/request.safe-string.validation';
import { MaxBinaryFileConstraint } from 'src/common/request/validations/request.max-binary-file.validation';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {GqlExecutionContext, GraphQLModule} from "@nestjs/graphql";
import {GqlThrottlerGuard} from "./guards/grpahql.throttler.guard";
import {ApolloDriver, ApolloDriverConfig} from "@nestjs/apollo";
import {GqlConfigService} from "../graphql/config/gql-config.service";
import {RequestHelmetMiddleware} from "./middleware/helmet/request.helmet.middleware";
import {RequestIdMiddleware} from "./middleware/id/request.id.middleware";
import {
    RequestJsonBodyParserMiddleware, RequestRawBodyParserMiddleware,
    RequestTextBodyParserMiddleware, RequestUrlencodedBodyParserMiddleware
} from "./middleware/body-parser/request.body-parser.middleware";
import {RequestCorsMiddleware} from "./middleware/cors/request.cors.middleware";
import {RequestVersionMiddleware} from "./middleware/version/request.version.middleware";
import {RequestUserAgentMiddleware} from "./middleware/user-agent/request.user-agent.middleware";
import {RequestTimestampMiddleware} from "./middleware/timestamp/request.timestamp.middleware";
import {RequestTimezoneMiddleware} from "./middleware/timezone/request.timezone.middleware";

@Module({
    controllers: [],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: RequestTimeoutInterceptor,
        },
        {
            provide: APP_PIPE,
            useFactory: () =>
                new ValidationPipe({
                    transform: true,
                    skipNullProperties: false,
                    skipUndefinedProperties: false,
                    skipMissingProperties: false,
                    forbidUnknownValues: false,
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                    exceptionFactory: async (errors: ValidationError[]) =>
                        new UnprocessableEntityException({
                            statusCode:
                                ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR,
                            message: 'request.validation',
                            errors,
                        }),
                }),
        },
        {
            provide: APP_GUARD,
            useClass: GqlThrottlerGuard,
        },
        IsPasswordStrongConstraint,
        IsPasswordMediumConstraint,
        IsPasswordWeakConstraint,
        IsStartWithConstraint,
        MaxGreaterThanEqualConstraint,
        MaxGreaterThanConstraint,
        MinGreaterThanEqualConstraint,
        MinGreaterThanConstraint,
        SafeStringConstraint,
        IsOnlyDigitsConstraint,
        MinDateTodayConstraint,
        MobileNumberAllowedConstraint,
        MaxDateTodayConstraint,
        MaxBinaryFileConstraint,
    ],
    imports: [
        RequestMiddlewareModule,

        GraphQLModule.forRootAsync<ApolloDriverConfig>({

            imports: [],
            driver: ApolloDriver,
            useClass: GqlConfigService,

        }),
        // GqlThrottlerGuard,
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                ttl: config.get('request.throttle.ttl'),
                limit: config.get('request.throttle.limit'),
            }),
        }),
    ],
})



export class RequestModule {}
