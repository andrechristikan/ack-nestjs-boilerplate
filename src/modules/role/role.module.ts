import { Module } from '@nestjs/common';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';

@Module({
    controllers: [],
    providers: [RoleService, RoleUtil],
    exports: [RoleService, RoleUtil],
    imports: [],
})
export class RoleModule {}
