import { Module } from '@nestjs/common';
import { PasswordHistoryRepositoryModule } from '@modules/password-history/repository/password-history.repository.module';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';

@Module({
    imports: [PasswordHistoryRepositoryModule],
    exports: [PasswordHistoryService],
    providers: [PasswordHistoryService],
    controllers: [],
})
export class PasswordHistoryModule {}
