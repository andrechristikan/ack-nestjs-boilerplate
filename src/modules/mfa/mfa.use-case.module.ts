import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { DeviceModule } from '@modules/device/device.module';
import { MfaModule } from '@modules/mfa/mfa.module';
import { MfaDeletePasskeyUseCase } from '@modules/mfa/use-cases/mfa.delete-passkey.use-case';
import { MfaDisableTotpUseCase } from '@modules/mfa/use-cases/mfa.disable-totp.use-case';
import { MfaEnableTotpUseCase } from '@modules/mfa/use-cases/mfa.enable-totp.use-case';
import { MfaGeneratePasskeyRegistrationUseCase } from '@modules/mfa/use-cases/mfa.generate-passkey-registration.use-case';
import { MfaGeneratePasskeyReauthenticationUseCase } from '@modules/mfa/use-cases/mfa.generate-passkey-reauthentication.use-case';
import { MfaGetStatusUseCase } from '@modules/mfa/use-cases/mfa.get-status.use-case';
import { MfaProcessPurgeExpiredUseCase } from '@modules/mfa/use-cases/mfa.process-purge-expired.use-case';
import { MfaRegenerateBackupCodesUseCase } from '@modules/mfa/use-cases/mfa.regenerate-backup-codes.use-case';
import { MfaRegisterPasskeyUseCase } from '@modules/mfa/use-cases/mfa.register-passkey.use-case';
import { MfaResetByAdminUseCase } from '@modules/mfa/use-cases/mfa.reset-by-admin.use-case';
import { MfaSetupTotpUseCase } from '@modules/mfa/use-cases/mfa.setup-totp.use-case';
import { MfaUpdatePasskeyUseCase } from '@modules/mfa/use-cases/mfa.update-passkey.use-case';
import { NotificationModule } from '@modules/notification/notification.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        MfaGetStatusUseCase,
        MfaSetupTotpUseCase,
        MfaEnableTotpUseCase,
        MfaDisableTotpUseCase,
        MfaProcessPurgeExpiredUseCase,
        MfaRegenerateBackupCodesUseCase,
        MfaResetByAdminUseCase,
        MfaGeneratePasskeyRegistrationUseCase,
        MfaGeneratePasskeyReauthenticationUseCase,
        MfaRegisterPasskeyUseCase,
        MfaUpdatePasskeyUseCase,
        MfaDeletePasskeyUseCase,
    ],
    exports: [
        MfaGetStatusUseCase,
        MfaSetupTotpUseCase,
        MfaEnableTotpUseCase,
        MfaDisableTotpUseCase,
        MfaProcessPurgeExpiredUseCase,
        MfaRegenerateBackupCodesUseCase,
        MfaResetByAdminUseCase,
        MfaGeneratePasskeyRegistrationUseCase,
        MfaGeneratePasskeyReauthenticationUseCase,
        MfaRegisterPasskeyUseCase,
        MfaUpdatePasskeyUseCase,
        MfaDeletePasskeyUseCase,
    ],
    imports: [
        ActivityLogModule,
        DeviceModule,
        MfaModule,
        NotificationModule,
        UserModule,
    ],
})
export class MfaUseCaseModule {}
