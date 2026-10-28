import { SessionProcessor } from '@modules/session/processors/session.processor';
import { SessionProcessorService } from '@modules/session/services/session.processor.service';
import { SessionDomainModule } from '@modules/session/session.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [SessionProcessor, SessionProcessorService],
    exports: [],
    imports: [SessionDomainModule],
})
export class SessionProcessorModule {}
