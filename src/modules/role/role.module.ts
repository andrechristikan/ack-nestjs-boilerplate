import { Module } from '@nestjs/common';
import { RoleRepositoryModule } from 'src/modules/role/repository/role.repository.module';
import { RoleService } from 'src/modules/role/services/role.service';

@Module({
    controllers: [],
    providers: [RoleService],
    exports: [RoleService],
    imports: [RoleRepositoryModule],
})
export class RoleModule {}
