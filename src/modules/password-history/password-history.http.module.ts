import { PasswordHistoryDomainModule } from '@modules/password-history/password-history.domain.module';
import { PasswordHistoryHttpService } from '@modules/password-history/services/password-history.http.service';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [PasswordHistoryHttpService],
    exports: [PasswordHistoryHttpService],
    imports: [PasswordHistoryDomainModule, UserDomainModule],
})
export class PasswordHistoryHttpModule {}
