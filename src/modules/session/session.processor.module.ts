import { DeviceDomainModule } from '@modules/device/device.domain.module';
import { SessionProcessor } from '@modules/session/processors/session.processor';
import { SessionProcessorService } from '@modules/session/services/processor/session.processor.service';
import { SessionDomainModule } from '@modules/session/session.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [SessionProcessor, SessionProcessorService],
    exports: [],
    imports: [SessionDomainModule, DeviceDomainModule],
})
export class SessionProcessorModule {}
