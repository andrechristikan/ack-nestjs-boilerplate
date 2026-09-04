import { SessionRepository } from '@modules/session/repositories/session.repository';
import { Global, Module } from '@nestjs/common';

/**
 * Global so session persistence is reachable from any module context.
 */
@Global()
@Module({
    controllers: [],
    providers: [SessionRepository],
    exports: [SessionRepository],
    imports: [],
})
export class SessionRepositoryModule {}
