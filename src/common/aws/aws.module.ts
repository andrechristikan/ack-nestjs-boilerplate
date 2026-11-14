import { Module } from '@nestjs/common';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { AwsSNSService } from '@common/aws/services/aws.sns.service';

/**
 * Provides and exports `AwsS3Service`, `AwsSESService` and `AwsSNSService`.
 */
@Module({
    exports: [AwsS3Service, AwsSESService, AwsSNSService],
    providers: [AwsS3Service, AwsSESService, AwsSNSService],
    imports: [],
    controllers: [],
})
export class AwsModule {}
