import { RoleRepository } from '@modules/role/repositories/role.repository';
import { Global, Module } from '@nestjs/common';

/**
 * Global so role persistence is reachable from any module context.
 */
@Global()
@Module({
    controllers: [],
    providers: [RoleRepository],
    exports: [RoleRepository],
    imports: [],
})
export class RoleRepositoryModule {}
