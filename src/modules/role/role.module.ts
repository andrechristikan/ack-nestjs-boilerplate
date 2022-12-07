import { Module } from '@nestjs/common';
import { RoleRepositoryModule } from 'src/modules/role/repository/role.repository.module';
import { RoleEnumService } from 'src/modules/role/services/role.enum.service';
import { RoleUseCase } from 'src/modules/role/use-cases/role.use-case';
import { RoleBulkService } from './services/role.bulk.service';
import { RoleService } from './services/role.service';

@Module({
    controllers: [],
    providers: [RoleService, RoleBulkService, RoleEnumService, RoleUseCase],
    exports: [RoleService, RoleBulkService, RoleEnumService, RoleUseCase],
    imports: [RoleRepositoryModule],
})
export class RoleModule {}
