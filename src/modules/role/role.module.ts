import { Module } from '@nestjs/common';
import { RoleRepositoryModule } from 'src/modules/role/repository/role.repository.module';
import { RoleEnumService } from 'src/modules/role/services/role.enum.service';
import { RoleService } from './services/role.service';

@Module({
    controllers: [],
    providers: [RoleService, RoleEnumService],
    exports: [RoleService, RoleEnumService],
    imports: [RoleRepositoryModule],
})
export class RoleModule {}
