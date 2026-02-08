import { Module } from '@nestjs/common';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { PasswordHistoryUtil } from '@modules/password-history/utils/password-history.util';

@Module({
    imports: [],
    exports: [PasswordHistoryRepository, PasswordHistoryUtil],
    providers: [PasswordHistoryRepository, PasswordHistoryUtil],
    controllers: [],
})
export class PasswordHistorySharedModule {}
