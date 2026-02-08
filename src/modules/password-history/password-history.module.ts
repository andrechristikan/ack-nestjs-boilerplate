import { Module } from '@nestjs/common';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { PasswordHistorySharedModule } from '@modules/password-history/password-history.shared.module';

@Module({
    imports: [PasswordHistorySharedModule],
    exports: [PasswordHistoryService],
    providers: [PasswordHistoryService],
    controllers: [],
})
export class PasswordHistoryModule {}
