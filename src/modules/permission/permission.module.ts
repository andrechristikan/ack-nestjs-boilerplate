import { Module } from '@nestjs/common';
import { PermissionRepositoryModule } from 'src/modules/permission/repository/permission.repository.module';
import { PermissionEnumService } from 'src/modules/permission/services/permission.enum.service';
import { PermissionService } from './services/permission.service';

@Module({
    controllers: [],
    providers: [PermissionService, PermissionEnumService],
    exports: [PermissionService, PermissionEnumService],
    imports: [PermissionRepositoryModule],
})
export class PermissionModule {}
