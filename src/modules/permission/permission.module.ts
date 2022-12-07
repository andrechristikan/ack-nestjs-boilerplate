import { Module } from '@nestjs/common';
import { PermissionRepositoryModule } from 'src/modules/permission/repository/permission.repository.module';
import { PermissionEnumService } from 'src/modules/permission/services/permission.enum.service';
import { PermissionUseCase } from 'src/modules/permission/use-cases/permission.use-case';
import { PermissionBulkService } from './services/permission.bulk.service';
import { PermissionService } from './services/permission.service';

@Module({
    controllers: [],
    providers: [
        PermissionService,
        PermissionBulkService,
        PermissionEnumService,
        PermissionUseCase,
    ],
    exports: [
        PermissionService,
        PermissionBulkService,
        PermissionEnumService,
        PermissionUseCase,
    ],
    imports: [PermissionRepositoryModule],
})
export class PermissionModule {}
