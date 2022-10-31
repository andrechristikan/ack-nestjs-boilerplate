import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AwsModule } from 'src/common/aws/aws.module';
import { SettingController } from 'src/common/setting/controllers/setting.controller';
import { HealthController } from 'src/health/controllers/health.controller';
import { HealthModule } from 'src/health/health.module';

@Module({
    controllers: [HealthController, SettingController],
    providers: [],
    exports: [],
    imports: [AwsModule, HealthModule, TerminusModule, HttpModule],
})
export class RoutesModule {}
