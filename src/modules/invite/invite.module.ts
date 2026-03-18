import { Global, Module } from '@nestjs/common';
import { InviteUtil } from '@modules/invite/utils/invite.util';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';

@Global()
@Module({
    imports: [UserModule, AuthModule],
    providers: [InviteUtil],
    exports: [InviteUtil],
})
export class InviteModule {}
