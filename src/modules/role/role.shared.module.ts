import { Module } from '@nestjs/common';
import { RoleUtil } from '@modules/role/utils/role.util';
import { RoleRepository } from '@modules/role/repositories/role.repository';

@Module({
    providers: [RoleRepository, RoleUtil],
    exports: [RoleRepository, RoleUtil],
    imports: [],
})
export class RoleSharedModule {}
