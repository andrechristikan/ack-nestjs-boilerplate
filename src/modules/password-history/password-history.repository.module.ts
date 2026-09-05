import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [PasswordHistoryRepository],
    exports: [PasswordHistoryRepository],
    imports: [],
})
export class PasswordHistoryRepositoryModule {}
