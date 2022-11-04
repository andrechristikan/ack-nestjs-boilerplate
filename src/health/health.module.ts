import { Module } from '@nestjs/common';
import { AwsModule } from 'src/common/aws/aws.module';
import { HealthAwsIndicator } from 'src/health/indicators/health.aws.indicator';

@Module({
    providers: [HealthAwsIndicator],
    exports: [HealthAwsIndicator],
    imports: [AwsModule],
})
export class HealthModule {}
