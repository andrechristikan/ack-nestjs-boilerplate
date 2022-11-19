import { Module } from '@nestjs/common';
import { MessageEnumController } from 'src/common/message/controllers/message.enum.controller';
import { PermissionEnumController } from 'src/modules/permission/controllers/permission.enum.controller';
import { PermissionModule } from 'src/modules/permission/permission.module';
import { RoleEnumController } from 'src/modules/role/controllers/role.enum.controller';
import { RoleModule } from 'src/modules/role/role.module';

@Module({
    controllers: [
        MessageEnumController,
        RoleEnumController,
        PermissionEnumController,
    ],
    providers: [],
    exports: [],
    imports: [RoleModule, PermissionModule],
})
export class RoutesEnumModule {}
