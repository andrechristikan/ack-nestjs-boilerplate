import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/common/auth/auth.module';
import { AwsModule } from 'src/common/aws/aws.module';
import { MessageController } from 'src/common/message/controllers/message.controller';
import { SettingController } from 'src/common/setting/controllers/setting.controller';
import { HealthController } from 'src/health/controllers/health.controller';
import { HealthModule } from 'src/health/health.module';
import { UserController } from 'src/modules/user/controllers/user.controller';
import { RoleModule } from 'src/modules/role/role.module';
import { UserModule } from 'src/modules/user/user.module';
import { PermissionModule } from 'src/modules/permission/permission.module';

@Module({
    controllers: [
        HealthController,
        SettingController,
        MessageController,
        UserController,
    ],
    providers: [],
    exports: [],
    imports: [
        AwsModule,
        TerminusModule,
        AuthModule,
        HealthModule,
        RoleModule,
        UserModule,
        PermissionModule,
    ],
})
export class RoutesModule {}
