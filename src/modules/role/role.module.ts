import { Module } from '@nestjs/common';
import { RoleRepositoryModule } from '@module/role/repository/role.repository.module';
import { RoleService } from '@module/role/services/role.service';

@Module({
    controllers: [],
    providers: [RoleService],
    exports: [RoleService],
    imports: [RoleRepositoryModule],
})
export class RoleModule {}
