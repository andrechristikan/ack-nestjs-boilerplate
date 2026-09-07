import { PasswordHistoryRepositoryModule } from '@modules/password-history/password-history.repository.module';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [PasswordHistoryService],
    exports: [PasswordHistoryService],
    imports: [PasswordHistoryRepositoryModule],
})
export class PasswordHistoryModule {}
