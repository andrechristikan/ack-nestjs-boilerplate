import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { PasswordHistoryUtilModule } from '@modules/password-history/password-history.util.module';
import { PasswordHistoryHttpService } from '@modules/password-history/services/password-history.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [PasswordHistoryHttpService],
    exports: [PasswordHistoryHttpService],
    imports: [PasswordHistoryModule, PasswordHistoryUtilModule],
})
export class PasswordHistoryHttpModule {}
