import { SessionRepositoryModule } from '@modules/session/session.repository.module';
import { SessionUtilModule } from '@modules/session/session.util.module';
import { SessionService } from '@modules/session/services/session.service';
import { Global, Module } from '@nestjs/common';

/** Global so the session domain service is reachable from any module context. */
@Global()
@Module({
    controllers: [],
    providers: [SessionService],
    exports: [SessionService],
    imports: [SessionRepositoryModule, SessionUtilModule],
})
export class SessionModule {}
