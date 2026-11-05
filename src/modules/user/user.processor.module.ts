import { DeviceDomainModule } from '@modules/device/device.domain.module';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { UserProcessor } from '@modules/user/processors/user.processor';
import { UserProcessorService } from '@modules/user/services/processor/user.processor.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [UserProcessor, UserProcessorService],
    exports: [],
    imports: [DeviceDomainModule, UserDomainModule],
})
export class UserProcessorModule {}
