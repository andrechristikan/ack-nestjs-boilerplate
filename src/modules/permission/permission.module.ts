import { Module } from '@nestjs/common';
import { PermissionRepositoryModule } from 'src/modules/permission/repository/permission.repository.module';
import { PermissionBulkService } from './services/permission.bulk.service';
import { PermissionService } from './services/permission.service';

@Module({
    controllers: [],
    providers: [PermissionService, PermissionBulkService],
    exports: [PermissionService, PermissionBulkService],
    imports: [PermissionRepositoryModule],
})
export class PermissionModule {}
