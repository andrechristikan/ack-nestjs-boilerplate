import { DeviceModule } from '@modules/device/device.module';
import { SessionProcessor } from '@modules/session/processors/session.processor';
import { SessionModule } from '@modules/session/session.module';
import { SessionGetListCursorUseCase } from '@modules/session/use-cases/session.get-list-cursor.use-case';
import { SessionGetListOffsetByAdminUseCase } from '@modules/session/use-cases/session.get-list-offset-by-admin.use-case';
import { SessionProcessPurgeLoginsUseCase } from '@modules/session/use-cases/session.process-purge-logins.use-case';
import { SessionRevokeAllByAdminUseCase } from '@modules/session/use-cases/session.revoke-all-by-admin.use-case';
import { SessionRevokeByAdminUseCase } from '@modules/session/use-cases/session.revoke-by-admin.use-case';
import { SessionRevokeUseCase } from '@modules/session/use-cases/session.revoke.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        SessionGetListOffsetByAdminUseCase,
        SessionGetListCursorUseCase,
        SessionRevokeUseCase,
        SessionRevokeByAdminUseCase,
        SessionRevokeAllByAdminUseCase,
        SessionProcessPurgeLoginsUseCase,
        SessionProcessor,
    ],
    exports: [
        SessionGetListOffsetByAdminUseCase,
        SessionGetListCursorUseCase,
        SessionRevokeUseCase,
        SessionRevokeByAdminUseCase,
        SessionRevokeAllByAdminUseCase,
        SessionProcessPurgeLoginsUseCase,
    ],
    imports: [SessionModule, DeviceModule],
})
export class SessionUseCaseModule {}
