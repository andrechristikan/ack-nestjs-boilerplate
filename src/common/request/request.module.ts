import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { RequestSchemaValidationPipe } from '@common/request/pipes/request.schema-validation.pipe';
import { RequestTimeoutInterceptor } from '@common/request/interceptors/request.timeout.interceptor';
import { RequestMiddlewareModule } from '@common/request/request.middleware.module';
import { RequestContextService } from '@common/request/services/request.context.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestThrottleService } from '@common/request/services/request.throttle.service';
import { RequestThrottleStorageService } from '@common/request/services/request.throttle-storage.service';
import { RequestThrottleUserGuard } from '@common/request/guards/request.throttle-user.guard';
import { RequestUtil } from '@common/request/utils/request.util';
import { ClsModule } from 'nestjs-cls';

/** Shared module: RequestStoreService, RequestContextService, RequestUtil, RequestThrottleService, and RequestThrottleStorageService for every guard, interceptor, service, and use case reading request state and for the ThrottlerModule storage, RequestThrottleUserGuard for the RequestThrottle decorator. */
@Global()
@Module({})
export class RequestModule {
    static forRoot(): DynamicModule {
        return {
            module: RequestModule,
            controllers: [],
            providers: [
                RequestStoreService,
                RequestContextService,
                RequestUtil,
                RequestThrottleService,
                RequestThrottleStorageService,
                RequestThrottleUserGuard,
                {
                    provide: APP_INTERCEPTOR,
                    useClass: RequestTimeoutInterceptor,
                },
                {
                    provide: APP_PIPE,
                    useClass: RequestSchemaValidationPipe,
                },
            ],
            exports: [
                RequestStoreService,
                RequestContextService,
                RequestUtil,
                RequestThrottleService,
                RequestThrottleStorageService,
                RequestThrottleUserGuard,
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
