import { UserDomainModule } from '@modules/user/user.domain.module';
import { UserProcessor } from '@modules/user/processors/user.processor';
import { UserProcessorService } from '@modules/user/services/user.processor.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [UserProcessor, UserProcessorService],
    exports: [],
    imports: [UserDomainModule],
})
export class UserProcessorModule {}
