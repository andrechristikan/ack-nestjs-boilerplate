import { PasswordHistoryRepositoryModule } from '@modules/password-history/password-history.repository.module';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [PasswordHistoryDomain],
    exports: [PasswordHistoryDomain],
    imports: [PasswordHistoryRepositoryModule],
})
export class PasswordHistoryDomainModule {}
