import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { PasswordHistoryGetListCursorUseCase } from '@modules/password-history/use-cases/password-history.get-list-cursor.use-case';
import { PasswordHistoryGetListOffsetByAdminUseCase } from '@modules/password-history/use-cases/password-history.get-list-offset-by-admin.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        PasswordHistoryGetListOffsetByAdminUseCase,
        PasswordHistoryGetListCursorUseCase,
    ],
    exports: [
        PasswordHistoryGetListOffsetByAdminUseCase,
        PasswordHistoryGetListCursorUseCase,
    ],
    imports: [PasswordHistoryModule],
})
export class PasswordHistoryUseCaseModule {}
