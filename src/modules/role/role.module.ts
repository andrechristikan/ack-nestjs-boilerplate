import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import { Global, Module } from '@nestjs/common';

/** Shared module: RoleService for the role guard and the user, device, policy, and session use cases. */
@Global()
@Module({
    controllers: [],
    providers: [RoleRepository, RoleService, RoleUtil],
    exports: [RoleService, RoleUtil],
    imports: [],
})
export class RoleModule {}
