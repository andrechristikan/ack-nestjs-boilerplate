import { RoleRepositoryModule } from '@modules/role/role.repository.module';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleUtil } from '@modules/role/utils/role.util';
import { Global, Module } from '@nestjs/common';

/** Global so every module reaches the role domain service and the role mapping app-wide. */
@Global()
@Module({
    controllers: [],
    providers: [RoleDomain, RoleUtil],
    exports: [RoleDomain, RoleUtil],
    imports: [RoleRepositoryModule],
})
export class RoleDomainModule {}
