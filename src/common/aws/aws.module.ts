import { Module } from '@nestjs/common';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { AwsSESService } from '@common/aws/services/aws.ses.service';

/**
 * AWS module that provides S3 and SES services.
 * Exports AWS services for use in other modules throughout the application.
 */
@Module({
    exports: [AwsS3Service, AwsSESService],
    providers: [AwsS3Service, AwsSESService],
    imports: [],
    controllers: [],
})
export class AwsModule {}
