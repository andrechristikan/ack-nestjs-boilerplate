import { Global, Module } from '@nestjs/common';
import { RequestThrottleUserGuard } from '@common/request/guards/request.throttle-user.guard';
import { RequestThrottleStorageService } from '@common/request/services/request.throttle-storage.service';

@Global()
@Module({
    controllers: [],
    providers: [RequestThrottleStorageService, RequestThrottleUserGuard],
    exports: [RequestThrottleStorageService, RequestThrottleUserGuard],
    imports: [],
})
export class RequestThrottleModule {}
