import { Module } from '@nestjs/common';
import { InvitationService } from '@modules/invitation/services/invitation.service';
import { InvitationRepository } from '@modules/invitation/repositories/invitation.repository';
import { InvitationUtil } from '@modules/invitation/utils/invitation.util';
import { EmailModule } from '@modules/email/email.module';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';

@Module({
    imports: [UserModule, RoleModule, EmailModule],
    providers: [InvitationService, InvitationRepository, InvitationUtil],
    exports: [InvitationService, InvitationRepository, InvitationUtil],
})
export class InvitationModule {}
