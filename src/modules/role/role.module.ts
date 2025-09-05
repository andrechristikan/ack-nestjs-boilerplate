import { Module } from '@nestjs/common';
import { RoleService } from '@modules/role/services/role.service';

@Module({
    controllers: [],
    providers: [RoleService],
    exports: [RoleService],
    imports: [],
})
export class RoleModule {}
