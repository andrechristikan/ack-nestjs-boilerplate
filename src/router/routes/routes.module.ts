import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/common/auth/auth.module';
import { SettingController } from 'src/common/setting/controllers/setting.controller';
import { AwsModule } from 'src/modules/aws/aws.module';
import { HealthController } from 'src/modules/health/controllers/health.controller';
import { HealthModule } from 'src/modules/health/health.module';
import { PermissionModule } from 'src/modules/permission/permission.module';
import { RoleModule } from 'src/modules/role/role.module';
import { UserController } from 'src/modules/user/controllers/user.controller';
import { UserModule } from 'src/modules/user/user.module';

@Module({
    controllers: [SettingController, UserController, HealthController],
    providers: [],
    exports: [],
    imports: [
        UserModule,
        AuthModule,
        AwsModule,
        PermissionModule,
        RoleModule,
        HealthModule,
        TerminusModule,
        HttpModule,
    ],
})
export class RoutesModule {}
