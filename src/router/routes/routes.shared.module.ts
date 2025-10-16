import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { ActivityLogSharedController } from '@modules/activity-log/controllers/activity-log.shared.controller';
import { PasswordHistorySharedController } from '@modules/password-history/controllers/password-history.shared.controller';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { SessionSharedController } from '@modules/session/controllers/session.shared.controller';
import { SessionModule } from '@modules/session/session.module';
import { TermPolicySharedController } from '@modules/term-policy/controllers/term-policy.shared.controller';
import { TermPolicyModule } from '@modules/term-policy/term-policy.module';
import { UserSharedController } from '@modules/user/controllers/user.shared.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [
        UserSharedController,
        PasswordHistorySharedController,
        ActivityLogSharedController,
        SessionSharedController,
        TermPolicySharedController,
    ],
    providers: [],
    exports: [],
    imports: [
        UserModule,
        PasswordHistoryModule,
        ActivityLogModule,
        SessionModule,
        TermPolicyModule,
    ],
})
export class RoutesSharedModule {}
