import { PasswordHistoryDomainModule } from '@modules/password-history/password-history.domain.module';
import { PasswordHistoryHttpService } from '@modules/password-history/services/password-history.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [PasswordHistoryHttpService],
    exports: [PasswordHistoryHttpService],
    imports: [PasswordHistoryDomainModule],
})
export class PasswordHistoryHttpModule {}
