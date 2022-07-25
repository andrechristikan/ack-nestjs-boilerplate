import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/auth/auth.module';
import { AuthCommonController } from 'src/auth/controller/auth.common.controller';
import { AwsModule } from 'src/aws/aws.module';
import { HealthCommonController } from 'src/health/controller/health.common.controller';
import { HealthModule } from 'src/health/health.module';
import { PermissionModule } from 'src/permission/permission.module';
import { RoleModule } from 'src/role/role.module';
import { SettingCommonController } from 'src/setting/controller/setting.common.controller';
import { UserCommonController } from 'src/user/controller/user.common.controller';
import { UserModule } from 'src/user/user.module';

@Module({
    controllers: [
        AuthCommonController,
        HealthCommonController,
        SettingCommonController,
        UserCommonController,
    ],
    providers: [],
    exports: [],
    imports: [
        UserModule,
        AuthModule,
        RoleModule,
        PermissionModule,
        TerminusModule,
        HttpModule,
        HealthModule,
        AwsModule,
    ],
})
export class RouterCommonModule {}
