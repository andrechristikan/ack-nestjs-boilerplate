import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/common/auth/auth.module';
import { AwsModule } from 'src/common/aws/aws.module';
import { MessageController } from 'src/common/message/controllers/message.enum.controller';
import { SettingController } from 'src/common/setting/controllers/setting.controller';
import { HealthController } from 'src/health/controllers/health.controller';
import { HealthModule } from 'src/health/health.module';
import { UserController } from 'src/modules/user/controllers/user.controller';
import { UserModule } from 'src/modules/user/user.module';

@Module({
    controllers: [
        HealthController,
        SettingController,
        UserController,
        MessageController,
    ],
    providers: [],
    exports: [],
    imports: [
        AwsModule,
        HealthModule,
        TerminusModule,
        HttpModule,
        UserModule,
        AuthModule,
    ],
})
export class RoutesModule {}
