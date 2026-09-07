import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { PasswordHistoryHttpService } from '@modules/password-history/services/password-history.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [PasswordHistoryHttpService],
    exports: [PasswordHistoryHttpService],
    imports: [PasswordHistoryModule],
})
export class PasswordHistoryHttpModule {}
