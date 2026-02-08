import { Module } from '@nestjs/common';
import { RoleService } from '@modules/role/services/role.service';
import { RoleSharedModule } from '@modules/role/role.shared.module';

@Module({
    providers: [RoleService],
    exports: [RoleService],
    imports: [RoleSharedModule],
})
export class RoleModule {}
