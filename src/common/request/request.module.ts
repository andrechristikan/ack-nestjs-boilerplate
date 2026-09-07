import { DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import { RequestSchemaValidationPipe } from '@common/request/pipes/request.schema-validation.pipe';
import { RequestTimeoutInterceptor } from '@common/request/interceptors/request.timeout.interceptor';
import { RequestActorInterceptor } from '@common/request/interceptors/request.actor.interceptor';
import { RequestMiddlewareModule } from '@common/request/request.middleware.module';
import { RequestContextService } from '@common/request/services/request.context.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestThrottleUtil } from '@common/request/utils/request.throttle.util';
import { RequestUtil } from '@common/request/utils/request.util';
import { ClsModule } from 'nestjs-cls';

/**
 * Global module wiring the validation pipe, timeout interceptor,
 * `RequestStoreService`, and middleware.
 */
@Module({})
export class RequestModule {
    static forRoot(): DynamicModule {
        return {
            module: RequestModule,
            global: true,
            controllers: [],
            exports: [
                RequestStoreService,
                RequestContextService,
                RequestUtil,
                RequestThrottleUtil,
            ],
            providers: [
                RequestStoreService,
                RequestContextService,
                RequestUtil,
                RequestThrottleUtil,
                {
                    provide: APP_INTERCEPTOR,
                    useClass: RequestTimeoutInterceptor,
                },
                {
                    provide: APP_INTERCEPTOR,
                    useClass: RequestActorInterceptor,
                },
                {
                    provide: APP_PIPE,
                    useFactory: () =>
                        new RequestSchemaValidationPipe({
                            exceptionFactory: (
                                issues: readonly StandardSchemaV1.Issue[]
                            ) => new RequestValidationException(issues),
                        }),
                },
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
