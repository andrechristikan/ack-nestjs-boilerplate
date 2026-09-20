import { PasswordHistoryRepositoryModule } from '@modules/password-history/password-history.repository.module';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { Module } from '@nestjs/common';
import { PasswordHistoryAnalyticDomain } from '@modules/password-history/domains/password-history.analytic.domain';

@Module({
    controllers: [],
    providers: [PasswordHistoryDomain, PasswordHistoryAnalyticDomain],
    exports: [PasswordHistoryDomain, PasswordHistoryAnalyticDomain],
    imports: [PasswordHistoryRepositoryModule],
})
export class PasswordHistoryDomainModule {}
