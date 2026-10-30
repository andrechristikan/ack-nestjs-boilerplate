import { AccountDomain } from '@modules/account/domains/account.domain';
import { AccountLoginDomain } from '@modules/account/domains/account.login.domain';
import { AccountPasswordDomain } from '@modules/account/domains/account.password.domain';
import { AccountTwoFactorDomain } from '@modules/account/domains/account.two-factor.domain';
import { AccountDeviceDomain } from '@modules/account/domains/account.device.domain';
import { DeviceDomainModule } from '@modules/device/device.domain.module';
import { PasswordHistoryDomainModule } from '@modules/password-history/password-history.domain.module';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { Module } from '@nestjs/common';

/** Composition module: flows that write across the auth, device, password-history, session, and user modules in one transaction. */
@Module({
    controllers: [],
    providers: [
        AccountDeviceDomain,
        AccountDomain,
        AccountLoginDomain,
        AccountPasswordDomain,
        AccountTwoFactorDomain,
    ],
    exports: [
        AccountDeviceDomain,
        AccountDomain,
        AccountLoginDomain,
        AccountPasswordDomain,
        AccountTwoFactorDomain,
    ],
    imports: [
        DeviceDomainModule,
        PasswordHistoryDomainModule,
        UserDomainModule,
    ],
})
export class AccountDomainModule {}
