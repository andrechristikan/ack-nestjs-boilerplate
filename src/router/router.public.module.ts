import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { AuthPublicController } from 'src/auth/controller/auth.public.controller';
import { PermissionModule } from 'src/permission/permission.module';
import { RoleModule } from 'src/role/role.module';
import { UserModule } from 'src/user/user.module';

@Module({
    controllers: [AuthPublicController],
    providers: [],
    exports: [],
    imports: [UserModule, AuthModule, RoleModule, PermissionModule],
})
export class RouterPublicModule {}
