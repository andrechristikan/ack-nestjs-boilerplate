import { Module } from '@nestjs/common';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';

@Module({
    controllers: [],
    providers: [RoleService, RoleUtil, RoleRepository, UserRepository],
    exports: [RoleService, RoleUtil, RoleRepository],
    imports: [],
})
export class RoleModule {}
