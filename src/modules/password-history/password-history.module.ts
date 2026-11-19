import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [PasswordHistoryRepository, PasswordHistoryService],
    exports: [PasswordHistoryService],
    imports: [],
})
export class PasswordHistoryModule {}
