import { SessionRepository } from '@modules/session/repositories/session.repository';
import { Module } from '@nestjs/common';
import { SessionAnalyticRepository } from '@modules/session/repositories/session.analytic.repository';

@Module({
    controllers: [],
    providers: [SessionRepository, SessionAnalyticRepository],
    exports: [SessionRepository, SessionAnalyticRepository],
    imports: [],
})
export class SessionRepositoryModule {}
