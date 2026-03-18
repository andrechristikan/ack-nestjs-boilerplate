import { Global, Module } from '@nestjs/common';
import { InviteUtil } from '@modules/invite/utils/invite.util';

@Global()
@Module({
    providers: [InviteUtil],
    exports: [InviteUtil],
})
export class InviteModule {}
