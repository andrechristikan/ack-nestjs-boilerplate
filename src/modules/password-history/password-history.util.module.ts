import { PasswordHistoryUtil } from '@modules/password-history/utils/password-history.util';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [PasswordHistoryUtil],
    exports: [PasswordHistoryUtil],
    imports: [],
})
export class PasswordHistoryUtilModule {}
