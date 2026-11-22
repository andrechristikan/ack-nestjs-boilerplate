import { PasswordHistoryAnalyticRepository } from '@modules/password-history/repositories/password-history.analytic.repository';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { PasswordHistoryAnalyticService } from '@modules/password-history/services/password-history.analytic.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        PasswordHistoryRepository,
        PasswordHistoryAnalyticRepository,
        PasswordHistoryService,
        PasswordHistoryAnalyticService,
    ],
    exports: [PasswordHistoryService, PasswordHistoryAnalyticService],
    imports: [],
})
export class PasswordHistoryModule {}
