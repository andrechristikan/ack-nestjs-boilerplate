import { Module } from '@nestjs/common';
import { PermissionRepositoryModule } from 'src/modules/permission/repository/permission.repository.module';
import { PermissionService } from './services/permission.service';

@Module({
    controllers: [],
    providers: [PermissionService],
    exports: [PermissionService],
    imports: [PermissionRepositoryModule],
})
export class PermissionModule {}
