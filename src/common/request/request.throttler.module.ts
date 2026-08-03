import { Module } from '@nestjs/common';
import { RequestThrottlerStorageService } from '@common/request/services/request.throttler.service';

@Module({
    providers: [RequestThrottlerStorageService],
    exports: [RequestThrottlerStorageService],
})
export class RequestThrottlerModule {}
