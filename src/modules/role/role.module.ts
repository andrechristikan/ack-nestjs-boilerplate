import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';

/** Shared module: RoleService for the user, device, policy, workspace, project, and session use cases. */
@Global()
@Module({})
export class RoleModule {
    static forRoot(): DynamicModule {
        return {
            module: RoleModule,
            controllers: [],
            providers: [RoleRepository, RoleService, RoleUtil],
            exports: [RoleService, RoleUtil],
            imports: [],
        };
    }
}
