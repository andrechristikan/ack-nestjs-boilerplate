import { Module } from '@nestjs/common';
import { InvitationService } from '@modules/invitation/services/invitation.service';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';

@Module({
    imports: [UserModule, RoleModule],
    providers: [InvitationService],
    exports: [InvitationService],
})
export class InvitationModule {}
