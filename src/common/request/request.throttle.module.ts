import { Global, Module } from '@nestjs/common';
import { RequestThrottleUserInterceptor } from '@common/request/interceptors/request.throttle-user.interceptor';
import { RequestThrottleStorageService } from '@common/request/services/request.throttle-storage.service';

@Global()
@Module({
    providers: [RequestThrottleStorageService, RequestThrottleUserInterceptor],
    exports: [RequestThrottleStorageService, RequestThrottleUserInterceptor],
})
export class RequestThrottleModule {}
