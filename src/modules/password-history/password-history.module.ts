import { Module } from '@nestjs/common';
import { PasswordHistoryRepositoryModule } from '@module/password-history/repository/password-history.repository.module';
import { PasswordHistoryService } from '@module/password-history/services/password-history.service';

@Module({
    imports: [PasswordHistoryRepositoryModule],
    exports: [PasswordHistoryService],
    providers: [PasswordHistoryService],
    controllers: [],
})
export class PasswordHistoryModule {}
