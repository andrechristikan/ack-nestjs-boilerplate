import { Module } from '@nestjs/common';
import { PermissionRepositoryModule } from 'src/modules/permission/repository/permission.repository.module';
import { PermissionEnumService } from 'src/modules/permission/services/permission.enum.service';
import { PermissionBulkService } from './services/permission.bulk.service';
import { PermissionService } from './services/permission.service';

@Module({
    controllers: [],
    providers: [
        PermissionService,
        PermissionBulkService,
        PermissionEnumService,
    ],
    exports: [PermissionService, PermissionBulkService, PermissionEnumService],
    imports: [PermissionRepositoryModule],
})
export class PermissionModule {}
