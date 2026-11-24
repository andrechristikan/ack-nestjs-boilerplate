import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionService } from '@modules/session/services/session.service';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserModule } from '@modules/user/user.module';
import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';

/** Shared module: SessionService for the JWT access strategy, the user module, and the user, mfa, and device use cases; SessionUtil for the user use cases. */
@Global()
@Module({})
export class SessionModule {
    static forRoot(): DynamicModule {
        return {
            module: SessionModule,
            controllers: [],
            providers: [
                SessionRepository,
                SessionService,
                SessionCache,
                SessionUtil,
            ],
            exports: [SessionService, SessionUtil],
            imports: [ActivityLogModule, UserModule],
        };
    }
}
