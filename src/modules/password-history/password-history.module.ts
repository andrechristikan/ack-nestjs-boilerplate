import { Module } from '@nestjs/common';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { PasswordHistoryUtil } from '@modules/password-history/utils/password-history.util';

@Module({
    imports: [],
    exports: [
        PasswordHistoryService,
        PasswordHistoryUtil,
        PasswordHistoryRepository,
    ],
    providers: [
        PasswordHistoryService,
        PasswordHistoryUtil,
        PasswordHistoryRepository,
    ],
    controllers: [],
})
export class PasswordHistoryModule {}
