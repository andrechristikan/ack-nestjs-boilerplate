import { PasswordHistoryRepositoryModule } from '@modules/password-history/password-history.repository.module';
import { PasswordHistoryUtilModule } from '@modules/password-history/password-history.util.module';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [PasswordHistoryService],
    exports: [PasswordHistoryService],
    imports: [PasswordHistoryRepositoryModule, PasswordHistoryUtilModule],
})
export class PasswordHistoryModule {}
