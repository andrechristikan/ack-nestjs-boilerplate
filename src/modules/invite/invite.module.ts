import { Module } from '@nestjs/common';
import { InviteService } from '@modules/invite/services/invite.service';
import { InviteRepository } from '@modules/invite/repositories/invite.repository';
import { InviteProviderRegistry } from '@modules/invite/services/invite-provider.registry';
import { InviteUtil } from '@modules/invite/utils/invite.util';
import { EmailModule } from '@modules/email/email.module';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';

@Module({
    imports: [UserModule, RoleModule, EmailModule],
    providers: [InviteService, InviteRepository, InviteProviderRegistry, InviteUtil],
    exports: [InviteService, InviteRepository, InviteProviderRegistry, InviteUtil],
})
export class InviteModule {}
