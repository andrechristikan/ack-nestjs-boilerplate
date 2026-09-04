import { RoleRepositoryModule } from '@modules/role/role.repository.module';
import { RoleUtilModule } from '@modules/role/role.util.module';
import { RoleService } from '@modules/role/services/role.service';
import { Global, Module } from '@nestjs/common';

/** Global so the role guard reaches the role domain service app-wide. */
@Global()
@Module({
    controllers: [],
    providers: [RoleService],
    exports: [RoleService],
    imports: [RoleRepositoryModule, RoleUtilModule],
})
export class RoleModule {}
