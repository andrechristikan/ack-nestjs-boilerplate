import { RoleRepositoryModule } from '@modules/role/role.repository.module';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleUtil } from '@modules/role/utils/role.util';
import { Global, Module } from '@nestjs/common';

/** Shared module: RoleDomain for the role guard and the user, device, policy, and session HTTP services. */
@Global()
@Module({
    controllers: [],
    providers: [RoleDomain, RoleUtil],
    exports: [RoleDomain, RoleUtil],
    imports: [RoleRepositoryModule],
})
export class RoleDomainModule {}
