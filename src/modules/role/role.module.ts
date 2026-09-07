import { RoleRepositoryModule } from '@modules/role/role.repository.module';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import { Global, Module } from '@nestjs/common';

/** Global so the role guard reaches the role domain service and the role mapping app-wide. */
@Global()
@Module({
    controllers: [],
    providers: [RoleService, RoleUtil],
    exports: [RoleService, RoleUtil],
    imports: [RoleRepositoryModule],
})
export class RoleModule {}
