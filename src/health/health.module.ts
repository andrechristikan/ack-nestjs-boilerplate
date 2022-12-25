import { Module } from '@nestjs/common';
import { AwsModule } from 'src/common/aws/aws.module';
import { HealthAwsS3Indicator } from 'src/health/indicators/health.aws-s3.indicator';

@Module({
    providers: [HealthAwsS3Indicator],
    exports: [HealthAwsS3Indicator],
    imports: [AwsModule],
})
export class HealthModule {}
