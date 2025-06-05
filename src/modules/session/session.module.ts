import { Module } from '@nestjs/common';
import { SessionRepositoryModule } from '@modules/session/repository/session.repository.module';
import { SessionService } from '@modules/session/services/session.service';

@Module({
    imports: [SessionRepositoryModule],
    exports: [SessionService],
    providers: [SessionService],
    controllers: [],
})
export class SessionModule {}
