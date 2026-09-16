import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { Module } from '@nestjs/common';
import { PasswordHistoryAnalyticRepository } from '@modules/password-history/repositories/password-history.analytic.repository';

@Module({
    controllers: [],
    providers: [PasswordHistoryRepository, PasswordHistoryAnalyticRepository],
    exports: [PasswordHistoryRepository, PasswordHistoryAnalyticRepository],
    imports: [],
})
export class PasswordHistoryRepositoryModule {}
