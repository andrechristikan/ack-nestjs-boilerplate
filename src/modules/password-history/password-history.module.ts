import { Module } from '@nestjs/common';
import { PasswordHistoryRepositoryModule } from 'src/modules/password-history/repository/password-history.repository.module';
import { PasswordHistoryService } from 'src/modules/password-history/services/password-history.service';

@Module({
    imports: [PasswordHistoryRepositoryModule],
    exports: [PasswordHistoryService],
    providers: [PasswordHistoryService],
    controllers: [],
})
export class PasswordHistoryModule {}
