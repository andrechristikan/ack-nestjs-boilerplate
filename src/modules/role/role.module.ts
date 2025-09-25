import { DynamicModule, Global, Module } from '@nestjs/common';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import { RoleRepository } from '@modules/role/repositories/role.repository';

@Global()
@Module({})
export class RoleModule {
    static forRoot(): DynamicModule {
        return {
            module: RoleModule,
            providers: [RoleService, RoleUtil, RoleRepository],
            exports: [RoleService, RoleUtil, RoleRepository],
            imports: [],
        };
    }
}
