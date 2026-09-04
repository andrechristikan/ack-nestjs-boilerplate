import { RoleUtil } from '@modules/role/utils/role.util';
import { Global, Module } from '@nestjs/common';

/**
 * Global so role mapping is reachable from any module context.
 */
@Global()
@Module({
    controllers: [],
    providers: [RoleUtil],
    exports: [RoleUtil],
    imports: [],
})
export class RoleUtilModule {}
