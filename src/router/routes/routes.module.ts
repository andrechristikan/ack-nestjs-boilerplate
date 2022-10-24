import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/common/auth/auth.module';
import { AuthController } from 'src/common/auth/controllers/auth.controller';
import { AwsModule } from 'src/common/aws/aws.module';
import { SettingController } from 'src/common/setting/controllers/setting.controller';
import { HealthController } from 'src/health/controllers/health.controller';
import { HealthModule } from 'src/health/health.module';
import { UserController } from 'src/modules/user/controllers/user.controller';
import { UserModule } from 'src/modules/user/user.module';

@Module({
    controllers: [
        HealthController,
        AuthController,
        SettingController,
        UserController,
    ],
    providers: [],
    exports: [],
    imports: [
        AuthModule,
        AwsModule,
        HealthModule,
        TerminusModule,
        HttpModule,
        UserModule,
    ],
})
export class RoutesModule {}
