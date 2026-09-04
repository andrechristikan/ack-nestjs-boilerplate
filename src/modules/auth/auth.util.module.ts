import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { Global, Module } from '@nestjs/common';

/**
 * Global so token signing, password hashing and two-factor helpers are reachable
 * from any module context.
 */
@Global()
@Module({
    controllers: [],
    providers: [AuthUtil, AuthTwoFactorUtil],
    exports: [AuthUtil, AuthTwoFactorUtil],
    imports: [],
})
export class AuthUtilModule {}
