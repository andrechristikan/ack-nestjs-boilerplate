import { Module } from '@nestjs/common';
import { RoleRepositoryModule } from '@modules/role/repository/role.repository.module';
import { RoleService } from '@modules/role/services/role.service';

@Module({
    controllers: [],
    providers: [RoleService],
    exports: [RoleService, RoleRepositoryModule],
    imports: [RoleRepositoryModule],
})
export class RoleModule {}
