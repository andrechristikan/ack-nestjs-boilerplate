import { Global, Module } from '@nestjs/common';
import { RequestThrottleInterceptor } from '@common/request/interceptors/request.throttle.interceptor';
import { RequestThrottlerStorageService } from '@common/request/services/request.throttler.service';

@Global()
@Module({
    providers: [RequestThrottlerStorageService, RequestThrottleInterceptor],
    exports: [RequestThrottlerStorageService, RequestThrottleInterceptor],
})
export class RequestThrottlerModule {}
