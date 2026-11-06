import { Global, Module } from '@nestjs/common';
import { RequestThrottleUserGuard } from '@common/request/guards/request.throttle-user.guard';
import { RequestThrottleStorageService } from '@common/request/services/request.throttle-storage.service';

/** Shared module: RequestThrottleStorageService for the ThrottlerModule storage, RequestThrottleUserGuard for the RequestThrottle decorator. */
@Global()
@Module({
    controllers: [],
    providers: [RequestThrottleStorageService, RequestThrottleUserGuard],
    exports: [RequestThrottleStorageService, RequestThrottleUserGuard],
    imports: [],
})
export class RequestThrottleModule {}
