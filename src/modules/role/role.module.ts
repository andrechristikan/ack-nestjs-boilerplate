import { Global, Module } from '@nestjs/common';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import { RoleRepository } from '@modules/role/repositories/role.repository';

@Global()
@Module({
    providers: [RoleService, RoleRepository, RoleUtil],
    exports: [RoleService, RoleRepository, RoleUtil],
    imports: [],
})
export class RoleModule {}
