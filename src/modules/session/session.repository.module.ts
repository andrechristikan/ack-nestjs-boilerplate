import { SessionRepository } from '@modules/session/repositories/session.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [SessionRepository],
    exports: [SessionRepository],
    imports: [],
})
export class SessionRepositoryModule {}
