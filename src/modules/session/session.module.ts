import { Module } from '@nestjs/common';
import { SessionRepositoryModule } from '@module/session/repository/session.repository.module';
import { SessionService } from '@module/session/services/session.service';

@Module({
    imports: [SessionRepositoryModule],
    exports: [SessionService],
    providers: [SessionService],
    controllers: [],
})
export class SessionModule {}
