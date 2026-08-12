import { Module } from '@nestjs/common';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { PasswordHistoryUtil } from '@modules/password-history/utils/password-history.util';

@Module({
    imports: [],
    exports: [PasswordHistoryService, PasswordHistoryRepository],
    providers: [
        PasswordHistoryService,
        PasswordHistoryRepository,
        PasswordHistoryUtil,
    ],
    controllers: [],
})
export class PasswordHistoryModule {}
